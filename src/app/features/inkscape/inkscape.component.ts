import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, HostListener, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { ElectronService } from '../../core/services/electron.service';

export interface InkColor { r: number; g: number; b: number; a: number; }
export interface InkStroke { color: InkColor; width: number; dash: string; linecap: string; linejoin: string; }
export interface InkObject {
  id: string; type: string;
  x: number; y: number; width: number; height: number;
  cx?: number; cy?: number; rx?: number; ry?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  d?: string; content?: string; fontSize?: number;
  fontFamily?: string; fontWeight?: string; points?: string;
  fill: InkColor; stroke: InkStroke; opacity: number; rotation: number;
  layerId: string; locked: boolean; visible: boolean; label?: string;
}
export interface InkLayer { id: string; name: string; visible: boolean; locked: boolean; opacity: number; }
export interface InkProject {
  id: string; title: string; objects: InkObject[]; layers: InkLayer[];
  canvasW: number; canvasH: number; savedAt: number; thumbnail?: string;
}

function uid(): string { return 'o_' + Math.random().toString(36).substring(2, 9); }
function colorToCss(c: InkColor): string { return `rgba(${c.r},${c.g},${c.b},${c.a})`; }
function colorToHex(c: InkColor): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b);
}
function hexToColor(hex: string, a = 1): InkColor {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16), a };
}
function defaultFill(): InkColor { return { r: 100, g: 149, b: 237, a: 1 }; }
function defaultStroke(): InkStroke {
  return { color: { r: 30, g: 30, b: 30, a: 1 }, width: 1.5, dash: '', linecap: 'round', linejoin: 'round' };
}

@Component({
  selector: 'app-inkscape',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
<div class="ink-root" tabindex="0" (keydown)="onKeyDown($event)">

  <!-- MENU BAR -->
  <nav class="ink-menubar">
    <div class="ink-logo">
      <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
        <circle cx="16" cy="16" r="14" fill="#2a2a3e" stroke="#7c3aed" stroke-width="1.5"/>
        <path d="M8 24 L16 7 L24 24" stroke="#7c3aed" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
        <line x1="11" y1="18" x2="21" y2="18" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span class="ink-logo-text">Inkscape</span>
      <span class="ink-badge">SVG Editor</span>
    </div>

    @for (menu of menus; track menu.label) {
      <div class="ink-menu-wrap">
        <button class="ink-menu-btn">{{ menu.label }}</button>
        <div class="ink-dropdown">
          @for (item of menu.items; track item.label) {
            <button class="ink-dd-item" (click)="item.action()">
              <span>{{ item.label }}</span>
              @if (item.shortcut) { <span class="ink-sc">{{ item.shortcut }}</span> }
            </button>
            @if (item.separator) { <div class="ink-sep"></div> }
          }
        </div>
      </div>
    }

    <div class="ink-menubar-r">
      <button (click)="openInkModal=true" class="ink-open-btn">
        <svg lucideIcon="external-link" class="w-3 h-3"></svg> Open in Inkscape
      </button>
      <span class="ink-info">{{ canvasW }}x{{ canvasH }} | {{ Math.round(zoom()*100) }}%</span>
    </div>
  </nav>

  <!-- TOOL OPTIONS BAR -->
  <div class="ink-optbar">
    @if (activeTool()==='select' && selObj) {
      <label>X:<input type="number" class="ink-inp" [ngModel]="Math.round(selObj.x)" (ngModelChange)="selObj&&(selObj.x=$event)&&refreshSvg()"></label>
      <label>Y:<input type="number" class="ink-inp" [ngModel]="Math.round(selObj.y)" (ngModelChange)="selObj&&(selObj.y=$event)&&refreshSvg()"></label>
      <label>W:<input type="number" class="ink-inp" [ngModel]="Math.round(selObj.width)" (ngModelChange)="selObj&&(selObj.width=Math.max(1,$event))&&refreshSvg()"></label>
      <label>H:<input type="number" class="ink-inp" [ngModel]="Math.round(selObj.height)" (ngModelChange)="selObj&&(selObj.height=Math.max(1,$event))&&refreshSvg()"></label>
      <label>Rot:<input type="number" class="ink-inp" [ngModel]="Math.round(selObj.rotation)" (ngModelChange)="selObj&&(selObj.rotation=$event)&&refreshSvg()"></label>
    }
    @if (activeTool()==='rect') { <label>Rx:<input type="number" class="ink-inp" [(ngModel)]="toolOptRx"></label> }
    @if (activeTool()==='star') {
      <label>Points:<input type="number" min="3" max="20" class="ink-inp" [(ngModel)]="starPoints"></label>
      <label>Ratio:<input type="number" min="0.1" max="1" step="0.05" class="ink-inp" [(ngModel)]="starRatio"></label>
    }
    @if (activeTool()==='text') {
      <label>Font:<input type="text" class="ink-inp w-32" [(ngModel)]="textFont"></label>
      <label>Size:<input type="number" class="ink-inp" [(ngModel)]="textSize"></label>
      <button (click)="textBold=!textBold" [class.ink-btn-on]="textBold" class="ink-toggle font-bold">B</button>
      <button (click)="textItalic=!textItalic" [class.ink-btn-on]="textItalic" class="ink-toggle italic">I</button>
    }
    @if (activeTool()==='select' && selection().length===0) { <span class="ink-hint">Click or drag to select</span> }
    @if (activeTool()==='bezier') { <span class="ink-hint">Click points · Double-click to finish</span> }

    <div class="ink-zoom-ctrl">
      <button (click)="zoomOut()" class="ink-icon-btn"><svg lucideIcon="zoom-out" class="w-3.5 h-3.5"></svg></button>
      <input type="range" min="10" max="500" step="5" [ngModel]="Math.round(zoom()*100)" (ngModelChange)="setZoom($event/100)" style="width:80px;accent-color:#7c3aed">
      <button (click)="zoomIn()" class="ink-icon-btn"><svg lucideIcon="zoom-in" class="w-3.5 h-3.5"></svg></button>
      <button (click)="resetZoom()" class="ink-txt-btn">1:1</button>
      <button (click)="fitPage()" class="ink-txt-btn">Fit</button>
    </div>
  </div>

  <!-- MAIN AREA -->
  <div class="ink-main">

    <!-- LEFT TOOLBAR -->
    <aside class="ink-toolbar">
      @for (grp of toolGroups; track $index) {
        @for (tool of grp; track tool.id) {
          <button (click)="setTool(tool.id)" [class.ink-tool-active]="activeTool()===tool.id"
                  [title]="tool.label+(tool.shortcut?' ['+tool.shortcut+']':'')" class="ink-tool-btn">
            <svg [lucideIcon]="tool.icon" class="w-4 h-4"></svg>
          </button>
        }
        <div class="ink-tool-div"></div>
      }
    </aside>

    <!-- CANVAS -->
    <div class="ink-canvas-wrap" #canvasWrapper
         (mousedown)="onMouseDown($event)" (mousemove)="onMouseMove($event)"
         (mouseup)="onMouseUp($event)" (wheel)="onWheel($event)" (contextmenu)="$event.preventDefault()">

      <div class="ink-checker"></div>

      <div [style.transform]="canvasTransform()" style="position:absolute;transform-origin:0 0;will-change:transform">
        <div [style.width.px]="canvasW" [style.height.px]="canvasH" style="position:relative;background:#fff;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6)">
          <svg #svgCanvas [attr.width]="canvasW" [attr.height]="canvasH"
               [attr.viewBox]="'0 0 '+canvasW+' '+canvasH"
               style="position:absolute;top:0;left:0;width:100%;height:100%"
               xmlns="http://www.w3.org/2000/svg">

            @if (showGrid) {
              <defs>
                <pattern id="gm" [attr.width]="gridSize" [attr.height]="gridSize" patternUnits="userSpaceOnUse">
                  <path [attr.d]="'M '+gridSize+' 0 L 0 0 0 '+gridSize" fill="none" stroke="#ccc" stroke-width="0.3"/>
                </pattern>
                <pattern id="gM" [attr.width]="gridSize*5" [attr.height]="gridSize*5" patternUnits="userSpaceOnUse">
                  <rect [attr.width]="gridSize*5" [attr.height]="gridSize*5" fill="url(#gm)"/>
                  <path [attr.d]="'M '+(gridSize*5)+' 0 L 0 0 0 '+(gridSize*5)" fill="none" stroke="#ccc" stroke-width="0.6"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gM)" opacity="0.5"/>
            }

            @for (obj of visibleObjects(); track obj.id) {
              <g [attr.opacity]="obj.opacity" [attr.transform]="getObjTransform(obj)"
                 (mousedown)="onObjDown($event,obj)" style="cursor:move">
                @switch (obj.type) {
                  @case ('rect') {
                    <rect [attr.x]="obj.x" [attr.y]="obj.y" [attr.width]="obj.width" [attr.height]="obj.height"
                          [attr.rx]="toolOptRx" [attr.fill]="colorToCss(obj.fill)"
                          [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"
                          [attr.stroke-dasharray]="obj.stroke.dash"/>
                  }
                  @case ('circle') {
                    <circle [attr.cx]="obj.cx??obj.x+obj.width/2" [attr.cy]="obj.cy??obj.y+obj.height/2"
                            [attr.r]="obj.rx??obj.width/2" [attr.fill]="colorToCss(obj.fill)"
                            [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"/>
                  }
                  @case ('ellipse') {
                    <ellipse [attr.cx]="obj.cx??obj.x+obj.width/2" [attr.cy]="obj.cy??obj.y+obj.height/2"
                             [attr.rx]="obj.rx??obj.width/2" [attr.ry]="obj.ry??obj.height/2"
                             [attr.fill]="colorToCss(obj.fill)" [attr.stroke]="colorToCss(obj.stroke.color)"
                             [attr.stroke-width]="obj.stroke.width"/>
                  }
                  @case ('line') {
                    <line [attr.x1]="obj.x1??obj.x" [attr.y1]="obj.y1??obj.y"
                          [attr.x2]="obj.x2??obj.x+obj.width" [attr.y2]="obj.y2??obj.y+obj.height"
                          [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"
                          [attr.stroke-linecap]="obj.stroke.linecap" [attr.stroke-dasharray]="obj.stroke.dash"/>
                  }
                  @case ('path') {
                    <path [attr.d]="obj.d" [attr.fill]="colorToCss(obj.fill)"
                          [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"/>
                  }
                  @case ('text') {
                    <text [attr.x]="obj.x" [attr.y]="obj.y+(obj.fontSize??24)"
                          [attr.font-size]="obj.fontSize??24" [attr.font-family]="obj.fontFamily??'sans-serif'"
                          [attr.font-weight]="obj.fontWeight??'normal'" [attr.fill]="colorToCss(obj.fill)">{{ obj.content }}</text>
                  }
                  @case ('polygon') { <polygon [attr.points]="obj.points" [attr.fill]="colorToCss(obj.fill)" [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"/> }
                  @case ('star')    { <polygon [attr.points]="obj.points" [attr.fill]="colorToCss(obj.fill)" [attr.stroke]="colorToCss(obj.stroke.color)" [attr.stroke-width]="obj.stroke.width"/> }
                }
              </g>
            }

            @if (activeTool()==='select') {
              @for (sid of selection(); track sid) {
                @let so = getObj(sid); @if (so) {
                  <g style="pointer-events:none">
                    <rect [attr.x]="so.x-2" [attr.y]="so.y-2" [attr.width]="so.width+4" [attr.height]="so.height+4"
                          fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,2" [attr.transform]="getObjTransform(so)"/>
                    @for (h of getHandles(so); track h.pos) {
                      <rect [attr.x]="h.x-4" [attr.y]="h.y-4" width="8" height="8"
                            fill="white" stroke="#6366f1" stroke-width="1.5" rx="1"
                            style="pointer-events:all;cursor:nwse-resize"
                            (mousedown)="onHandleDown($event,so,h.pos)"/>
                    }
                  </g>
                }
              }
            }

            @if (isDragSel) {
              <rect [attr.x]="Math.min(rbStart.x,rbEnd.x)" [attr.y]="Math.min(rbStart.y,rbEnd.y)"
                    [attr.width]="Math.abs(rbEnd.x-rbStart.x)" [attr.height]="Math.abs(rbEnd.y-rbStart.y)"
                    fill="rgba(99,102,241,.1)" stroke="#6366f1" stroke-width="1" stroke-dasharray="4,2"/>
            }

            @if (isDrawing && drawPrev) {
              @switch (drawPrev.type) {
                @case ('rect')    { <rect [attr.x]="drawPrev.x" [attr.y]="drawPrev.y" [attr.width]="drawPrev.w" [attr.height]="drawPrev.h" fill="rgba(99,102,241,.12)" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,2"/> }
                @case ('circle')  { <circle [attr.cx]="drawPrev.cx" [attr.cy]="drawPrev.cy" [attr.r]="drawPrev.r" fill="rgba(99,102,241,.12)" stroke="#6366f1" stroke-width="1.5"/> }
                @case ('ellipse') { <ellipse [attr.cx]="drawPrev.cx" [attr.cy]="drawPrev.cy" [attr.rx]="drawPrev.rx" [attr.ry]="drawPrev.ry" fill="rgba(99,102,241,.12)" stroke="#6366f1" stroke-width="1.5"/> }
                @case ('line')    { <line [attr.x1]="drawPrev.x1" [attr.y1]="drawPrev.y1" [attr.x2]="drawPrev.x2" [attr.y2]="drawPrev.y2" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,2"/> }
                @case ('star')    { <polygon [attr.points]="drawPrev.pts" fill="rgba(99,102,241,.12)" stroke="#6366f1" stroke-width="1.5"/> }
              }
            }

            @if (activeTool()==='bezier' && bezPts.length>0) {
              <polyline [attr.points]="bezPts.map(p=>p.x+','+p.y).join(' ')" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,2"/>
              @for (pt of bezPts; track $index) {
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="#6366f1" stroke="white" stroke-width="1"/>
              }
            }
          </svg>

          @if (textInputOpen) {
            <textarea [(ngModel)]="textVal" (keydown.enter)="commitText($event)" (keydown.escape)="textInputOpen=false"
                      [style.left.px]="textPos.x" [style.top.px]="textPos.y"
                      [style.font-size.px]="textSize" [style.font-family]="textFont"
                      [style.font-weight]="textBold?'bold':'normal'"
                      style="position:absolute;background:transparent;border:1px solid #6366f1;outline:none;resize:none;color:#000;min-width:80px"
                      rows="1" autofocus></textarea>
          }
        </div>
      </div>

      <div class="ink-status">
        <span>{{ Math.round(cur.x) }}, {{ Math.round(cur.y) }}</span>
        <span>{{ objects().length }} objects</span>
        <span>{{ layers().length }} layers</span>
        @if (snapToGrid) { <span style="color:#818cf8">Snap ON</span> }
        @if (showGrid) { <span style="color:#6b7280">Grid</span> }
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <aside class="ink-panel">
      <div class="ink-tabs">
        @for (tab of panelTabs; track tab.id) {
          <button (click)="activePanel=tab.id" [class.ink-tab-on]="activePanel===tab.id" class="ink-tab">{{ tab.label }}</button>
        }
      </div>

      <!-- STYLE PANEL -->
      @if (activePanel==='fill') {
        <div class="ink-pbody">
          <div class="ink-sec">Fill</div>
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <button (click)="fillType='none'" [class.ink-ring]="fillType==='none'" class="ink-swatch-btn" title="No fill">&#8709;</button>
            <button (click)="fillType='flat'" [class.ink-ring]="fillType==='flat'" class="ink-swatch-btn" [style.background]="colorToCss(curFill)"></button>
          </div>
          @if (fillType==='flat') {
            <input type="color" [ngModel]="colorToHex(curFill)" (ngModelChange)="curFill=hexToColor($event,curFill.a);applyFill()" class="ink-color-inp">
            <label class="ink-lbl">A:<input type="range" min="0" max="1" step="0.01" [(ngModel)]="curFill.a" (ngModelChange)="applyFill()" style="flex:1"><span>{{ Math.round(curFill.a*100) }}</span></label>
            <div class="ink-palette">
              @for (c of palette; track c) {
                <button (click)="curFill=hexToColor(c);applyFill()" [style.background]="c" class="ink-pal-btn" [title]="c"></button>
              }
            </div>
          }
          <div class="ink-sec" style="margin-top:12px">Stroke</div>
          <input type="color" [ngModel]="colorToHex(curStroke.color)" (ngModelChange)="curStroke.color=hexToColor($event);applyStroke()" class="ink-color-inp">
          <label class="ink-lbl">Width:<input type="number" min="0" step="0.5" [(ngModel)]="curStroke.width" (ngModelChange)="applyStroke()" class="ink-inp"></label>
          <label class="ink-lbl">Dash:
            <select [(ngModel)]="curStroke.dash" (ngModelChange)="applyStroke()" class="ink-sel" style="flex:1">
              <option value="">Solid</option><option value="5,5">Dashed</option>
              <option value="2,2">Dotted</option><option value="10,5,2,5">Dash-Dot</option>
            </select>
          </label>
          <div class="ink-sec" style="margin-top:12px">Opacity</div>
          <label class="ink-lbl"><input type="range" min="0" max="1" step="0.01" [ngModel]="selObj?.opacity??1" (ngModelChange)="selObj&&(selObj.opacity=$event)&&refreshSvg()" style="flex:1"><span>{{ Math.round((selObj?.opacity??1)*100) }}%</span></label>
        </div>
      }

      <!-- LAYERS PANEL -->
      @if (activePanel==='layers') {
        <div class="ink-pbody">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span class="ink-sec" style="margin:0">Layers</span>
            <button (click)="addLayer()" class="ink-icon-btn"><svg lucideIcon="plus" class="w-4 h-4" style="color:#a78bfa"></svg></button>
          </div>
          @for (layer of layers().slice().reverse(); track layer.id) {
            <div [class.ink-layer-on]="activeLayerId()===layer.id" class="ink-layer" (click)="activeLayerId.set(layer.id)">
              <button (click)="$event.stopPropagation();toggleLayerVis(layer)"><svg [lucideIcon]="layer.visible?'eye':'eye-off'" class="w-3.5 h-3.5" style="color:#94a3b8"></svg></button>
              <button (click)="$event.stopPropagation();toggleLayerLock(layer)"><svg [lucideIcon]="layer.locked?'lock':'unlock'" class="w-3.5 h-3.5" style="color:#94a3b8"></svg></button>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cbd5e1;font-size:11px">{{ layer.name }}</span>
              <button (click)="$event.stopPropagation();deleteLayer(layer.id)"><svg lucideIcon="trash-2" class="w-3 h-3" style="color:#475569"></svg></button>
            </div>
          }
          <div class="ink-sec" style="margin-top:12px">Objects</div>
          @for (obj of activeLayerObjs(); track obj.id) {
            <div [class.ink-layer-on]="isSelected(obj.id)" class="ink-layer" (click)="selectObjFn(obj.id,$event)">
              <svg [lucideIcon]="objIcon(obj.type)" class="w-3 h-3" style="color:#64748b;flex-shrink:0"></svg>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#94a3b8;font-size:10px">{{ obj.label||obj.type+' '+obj.id.slice(-4) }}</span>
              <button (click)="$event.stopPropagation();deleteObject(obj.id)"><svg lucideIcon="trash-2" class="w-3 h-3" style="color:#374151"></svg></button>
            </div>
          }
        </div>
      }

      <!-- XML PANEL -->
      @if (activePanel==='xml') {
        <div class="ink-pbody" style="display:flex;flex-direction:column;gap:8px;flex:1">
          <div class="ink-sec">SVG XML</div>
          <textarea class="ink-xml" [(ngModel)]="xmlStr" spellcheck="false"></textarea>
          <button (click)="importXml()" class="ink-act-btn">Apply XML</button>
        </div>
      }

      <!-- FILES PANEL -->
      @if (activePanel==='files') {
        <div class="ink-pbody">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span class="ink-sec" style="margin:0">Projects</span>
            <button (click)="newProject()" class="ink-icon-btn"><svg lucideIcon="plus" class="w-4 h-4" style="color:#a78bfa"></svg></button>
          </div>
          <button (click)="saveProject()" class="ink-save-btn"><svg lucideIcon="save" class="w-3.5 h-3.5"></svg> Save Project</button>
          <div style="margin-top:8px">
            @for (p of savedProjects(); track p.id) {
              <div class="ink-proj" (click)="loadProject(p)">
                <div style="font-size:11px;font-weight:600;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ p.title }}</div>
                <div style="font-size:10px;color:#64748b">{{ p.objects.length }} objects | {{ fmtDate(p.savedAt) }}</div>
                @if (p.thumbnail) { <img [src]="p.thumbnail" style="margin-top:4px;width:100%;height:48px;object-fit:cover;border-radius:4px"> }
              </div>
            }
            @if (savedProjects().length===0) { <p style="color:#64748b;text-align:center;padding:16px 0;font-size:11px">No saved projects</p> }
          </div>
        </div>
      }

      <div class="ink-export-row">
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;display:block;margin-bottom:6px">Export</span>
        <div style="display:flex;gap:4px">
          <button (click)="exportSVG()" class="ink-exp-btn" style="background:#2563eb">SVG</button>
          <button (click)="exportPNG()" class="ink-exp-btn" style="background:#059669">PNG</button>
          <button (click)="importFile()" class="ink-exp-btn" style="background:#4b5563">Import</button>
        </div>
        <input #fileInput type="file" accept=".svg" style="display:none" (change)="onFileImp($event)">
      </div>
    </aside>
  </div>

  <!-- TEXT MODAL -->
  @if (showTextModal) {
    <div class="ink-overlay" (click)="showTextModal=false">
      <div class="ink-modal" (click)="$event.stopPropagation()">
        <h3 style="font-weight:700;color:white;margin-bottom:12px">Add Text</h3>
        <textarea [(ngModel)]="textVal" class="ink-xml" rows="3" placeholder="Type here..."></textarea>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button (click)="commitTextModal()" class="ink-act-btn" style="flex:1">Add</button>
          <button (click)="showTextModal=false" class="ink-cncl-btn">Cancel</button>
        </div>
      </div>
    </div>
  }

  <!-- INKSCAPE MODAL -->
  @if (openInkModal) {
    <div class="ink-overlay" (click)="openInkModal=false">
      <div class="ink-modal" style="max-width:500px" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg lucideIcon="pen-tool" class="w-5 h-5" style="color:white"></svg>
          </div>
          <div>
            <h3 style="font-weight:800;font-size:18px;color:white;margin:0">Inkscape الأصلي</h3>
            <p style="color:#64748b;font-size:11px;margin:2px 0 0">محرر SVG احترافي مفتوح المصدر</p>
          </div>
          @if (inkIsElectron && electronSvc.inkscapeInstalled()) {
            <span style="margin-left:auto;background:#059669;color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">مثبّت ✓</span>
          }
          @if (inkIsElectron && !electronSvc.inkscapeInstalled() && inkStatus()==='idle') {
            <span style="margin-left:auto;background:#dc2626;color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">غير مثبّت</span>
          }
        </div>

        <!-- Electron Mode: Status & Actions -->
        @if (inkIsElectron) {

          <!-- Status message -->
          @if (inkStatus() !== 'idle') {
            <div style="padding:12px 16px;background:rgba(255,255,255,.05);border-radius:10px;margin-bottom:16px;font-size:13px;color:#cbd5e1">
              {{ inkStatusMsg() }}
            </div>
          }

          <!-- Download progress bar -->
          @if (inkStatus() === 'downloading' || inkStatus() === 'installing') {
            <div style="margin-bottom:16px">
              <div style="background:rgba(255,255,255,.08);border-radius:8px;height:6px;overflow:hidden;margin-bottom:6px">
                <div [style.width.%]="electronSvc.downloadProgress()?.percent ?? 0"
                     style="height:100%;background:linear-gradient(90deg,#7c3aed,#6366f1);border-radius:8px;transition:width .4s"></div>
              </div>
              <span style="font-size:11px;color:#64748b">{{ electronSvc.downloadProgress()?.message }}</span>
            </div>
          }

          <!-- Installed: Open with sync -->
          @if (electronSvc.inkscapeInstalled()) {
            <div style="background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.3);border-radius:10px;padding:14px;margin-bottom:16px">
              <p style="font-size:13px;color:#6ee7b7;margin:0 0 6px;font-weight:600">✅ التزامن التلقائي مفعّل</p>
              <p style="font-size:12px;color:#94a3b8;margin:0">عند الحفظ في Inkscape سيُستورد الملف تلقائياً هنا</p>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <button (click)="openInRealInkscape()" class="ink-act-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px">
                <svg lucideIcon="external-link" class="w-4 h-4"></svg> فتح في Inkscape
              </button>
              <button (click)="openInkModal=false" class="ink-cncl-btn">إغلاق</button>
            </div>
          }

          <!-- Not installed: Download -->
          @if (!electronSvc.inkscapeInstalled() && inkStatus() !== 'downloading' && inkStatus() !== 'installing') {
            <p style="color:#94a3b8;font-size:13px;margin-bottom:16px">
              Inkscape غير مثبّت على هذا الجهاز. يمكن تثبيته تلقائياً (~100MB).
            </p>
            <div style="display:flex;gap:8px">
              <button (click)="downloadInkscape()" class="ink-act-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;background:#059669">
                <svg lucideIcon="download" class="w-4 h-4"></svg> تحميل وتثبيت Inkscape
              </button>
              <button (click)="openInkModal=false" class="ink-cncl-btn">لاحقاً</button>
            </div>
          }

          <!-- While downloading -->
          @if (inkStatus() === 'downloading' || inkStatus() === 'installing') {
            <div style="display:flex;justify-content:center">
              <button (click)="openInkModal=false" class="ink-cncl-btn">إخفاء (يتابع في الخلفية)</button>
            </div>
          }

        } @else {
          <!-- Web mode: manual steps -->
          <p style="color:#94a3b8;font-size:13px;margin-bottom:16px">صدّر ملف SVG ثم افتحه في Inkscape المثبّت على جهازك:</p>
          <ol style="list-style:none;padding:0;margin:0 0 20px;display:flex;flex-direction:column;gap:10px">
            <li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#cbd5e1">
              <span class="ink-step">1</span><span>اضغط <strong>Export SVG</strong> لتحميل الملف</span>
            </li>
            <li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#cbd5e1">
              <span class="ink-step">2</span><span>افتح <strong>Inkscape</strong> على جهازك</span>
            </li>
            <li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#cbd5e1">
              <span class="ink-step">3</span><span>اسحب الملف أو <strong>File → Open</strong></span>
            </li>
            <li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#cbd5e1">
              <span class="ink-step">4</span><span>بعد الحفظ، استخدم <strong>Import</strong> لإعادة الاستيراد</span>
            </li>
          </ol>
          <div style="display:flex;gap:8px">
            <button (click)="exportSVG();openInkModal=false" class="ink-act-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px">
              <svg lucideIcon="download" class="w-4 h-4"></svg> Export SVG
            </button>
            <button (click)="openInkModal=false" class="ink-cncl-btn">إغلاق</button>
          </div>
        }

      </div>
    </div>
  }

</div>
  `,
  styles: [`
    :host { display:block; height:100vh; overflow:hidden; }
    .ink-root { display:flex; flex-direction:column; height:100vh; background:#1e1e2e; color:#e2e8f0; font-family:system-ui,sans-serif; user-select:none; outline:none; }
    .ink-menubar { display:flex; align-items:center; background:#181825; border-bottom:1px solid rgba(255,255,255,.05); padding:0 8px; height:36px; flex-shrink:0; z-index:50; position:relative; }
    .ink-logo { display:flex; align-items:center; gap:8px; padding-right:12px; margin-right:8px; border-right:1px solid rgba(255,255,255,.08); }
    .ink-logo-text { font-weight:800; color:white; font-size:14px; }
    .ink-badge { font-size:9px; background:rgba(124,58,237,.25); border:1px solid rgba(124,58,237,.4); color:#a78bfa; padding:1px 5px; border-radius:4px; }
    .ink-menu-wrap { position:relative; }
    .ink-menu-btn { padding:4px 10px; border-radius:4px; font-size:11px; color:#94a3b8; background:transparent; border:none; cursor:pointer; }
    .ink-menu-btn:hover { background:rgba(255,255,255,.08); color:white; }
    .ink-dropdown { position:absolute; top:100%; left:0; margin-top:2px; width:190px; background:#181825; border:1px solid rgba(255,255,255,.1); border-radius:8px; box-shadow:0 20px 40px rgba(0,0,0,.5); z-index:9999; padding:4px; display:none; }
    .ink-menu-wrap:hover .ink-dropdown { display:block; }
    .ink-dd-item { width:100%; text-align:left; padding:5px 10px; font-size:11px; color:#94a3b8; background:transparent; border:none; cursor:pointer; display:flex; justify-content:space-between; border-radius:4px; }
    .ink-dd-item:hover:not(:disabled) { background:rgba(255,255,255,.08); color:white; }
    .ink-dd-item:disabled { opacity:.4; cursor:default; }
    .ink-sc { font-size:10px; color:#475569; }
    .ink-sep { border-top:1px solid rgba(255,255,255,.07); margin:3px 0; }
    .ink-menubar-r { margin-left:auto; display:flex; align-items:center; gap:8px; }
    .ink-open-btn { display:flex; align-items:center; gap:5px; padding:4px 10px; background:#7c3aed; color:white; border:none; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; }
    .ink-open-btn:hover { background:#6d28d9; }
    .ink-info { font-size:10px; color:#64748b; }
    .ink-optbar { display:flex; align-items:center; gap:8px; background:#1a1a2e; border-bottom:1px solid rgba(255,255,255,.05); padding:5px 12px; font-size:11px; flex-shrink:0; flex-wrap:wrap; min-height:36px; }
    .ink-optbar label { display:flex; align-items:center; gap:4px; color:#94a3b8; }
    .ink-inp { width:58px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:2px 5px; color:white; font-size:11px; }
    .ink-toggle { padding:2px 7px; border-radius:4px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#94a3b8; cursor:pointer; font-size:12px; }
    .ink-btn-on { background:rgba(124,58,237,.4)!important; border-color:#7c3aed!important; color:#a78bfa!important; }
    .ink-hint { color:#64748b; font-size:11px; }
    .ink-zoom-ctrl { margin-left:auto; display:flex; align-items:center; gap:4px; }
    .ink-icon-btn { padding:4px; border-radius:4px; background:transparent; border:none; color:#94a3b8; cursor:pointer; display:flex; align-items:center; }
    .ink-icon-btn:hover { background:rgba(255,255,255,.08); color:white; }
    .ink-txt-btn { padding:2px 7px; border-radius:4px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#94a3b8; font-size:10px; cursor:pointer; }
    .ink-txt-btn:hover { color:white; }
    .ink-main { display:flex; flex:1; min-height:0; }
    .ink-toolbar { width:44px; background:#181825; border-right:1px solid rgba(255,255,255,.05); display:flex; flex-direction:column; align-items:center; padding:6px 0; gap:2px; flex-shrink:0; overflow-y:auto; }
    .ink-tool-btn { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:none; background:transparent; color:#64748b; cursor:pointer; }
    .ink-tool-btn:hover { background:rgba(255,255,255,.08); color:#e2e8f0; }
    .ink-tool-active { background:#7c3aed!important; color:white!important; }
    .ink-tool-div { width:22px; border-top:1px solid rgba(255,255,255,.08); margin:3px 0; }
    .ink-canvas-wrap { flex:1; position:relative; overflow:hidden; background:#2a2a3e; }
    .ink-checker { position:absolute; inset:0; opacity:.15; background-image:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="8" height="8" fill="%23888"/><rect x="8" y="8" width="8" height="8" fill="%23888"/></svg>'); }
    .ink-status { position:absolute; bottom:0; left:0; right:0; background:rgba(24,24,37,.85); border-top:1px solid rgba(255,255,255,.05); padding:3px 12px; font-size:10px; color:#64748b; display:flex; gap:14px; z-index:30; }
    .ink-panel { width:240px; background:#181825; border-left:1px solid rgba(255,255,255,.05); display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto; }
    .ink-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,.05); flex-shrink:0; }
    .ink-tab { flex:1; padding:7px 0; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; border:none; background:transparent; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; }
    .ink-tab-on { color:#a78bfa!important; border-bottom-color:#7c3aed!important; }
    .ink-pbody { padding:12px; font-size:11px; flex:1; }
    .ink-sec { font-weight:700; color:#94a3b8; margin-bottom:8px; font-size:11px; display:block; }
    .ink-swatch-btn { width:28px; height:28px; border-radius:6px; border:1px solid rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#94a3b8; }
    .ink-ring { outline:2px solid #7c3aed; outline-offset:2px; }
    .ink-color-inp { width:100%; height:30px; border-radius:6px; border:none; cursor:pointer; background:transparent; margin-bottom:8px; display:block; }
    .ink-lbl { display:flex; align-items:center; gap:6px; color:#94a3b8; margin-bottom:6px; }
    .ink-palette { display:grid; grid-template-columns:repeat(8,1fr); gap:3px; margin-top:8px; }
    .ink-pal-btn { width:22px; height:22px; border-radius:4px; border:1px solid rgba(255,255,255,.1); cursor:pointer; }
    .ink-pal-btn:hover { transform:scale(1.15); }
    .ink-sel { background:#1e1e2e; border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:2px 5px; color:white; font-size:11px; }
    .ink-layer,.ink-obj { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:6px; border:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.03); margin-bottom:4px; cursor:pointer; }
    .ink-layer:hover { background:rgba(255,255,255,.06); }
    .ink-layer-on { background:rgba(124,58,237,.2)!important; border-color:rgba(124,58,237,.5)!important; }
    .ink-xml { width:100%; flex:1; background:#0d1117; border:1px solid rgba(255,255,255,.1); border-radius:6px; font-family:monospace; font-size:9px; padding:7px; color:#4ade80; resize:vertical; min-height:180px; }
    .ink-act-btn { width:100%; padding:7px; background:#7c3aed; color:white; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }
    .ink-act-btn:hover { background:#6d28d9; }
    .ink-cncl-btn { padding:7px 14px; background:rgba(255,255,255,.05); color:#94a3b8; border:none; border-radius:8px; font-size:12px; cursor:pointer; }
    .ink-save-btn { width:100%; padding:7px; background:#059669; color:white; border:none; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:8px; }
    .ink-save-btn:hover { background:#047857; }
    .ink-proj { padding:8px; border:1px solid rgba(255,255,255,.07); border-radius:8px; cursor:pointer; margin-bottom:6px; }
    .ink-proj:hover { background:rgba(255,255,255,.04); border-color:rgba(124,58,237,.3); }
    .ink-export-row { border-top:1px solid rgba(255,255,255,.05); padding:10px 12px; flex-shrink:0; }
    .ink-exp-btn { flex:1; padding:6px; border:none; border-radius:6px; font-size:10px; font-weight:700; color:white; cursor:pointer; }
    .ink-exp-btn:hover { filter:brightness(1.15); }
    .ink-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:200; display:flex; align-items:center; justify-content:center; padding:16px; }
    .ink-modal { background:#1e1e2e; border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:22px; width:100%; max-width:380px; box-shadow:0 25px 60px rgba(0,0,0,.6); }
    .ink-step { width:22px; height:22px; background:#7c3aed; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:700; flex-shrink:0; }
    ::-webkit-scrollbar { width:4px; height:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
  `]
})
export class InkscapeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasWrapper') wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  Math = Math;
  colorToCss = colorToCss;
  colorToHex = colorToHex;
  hexToColor = hexToColor;

  canvasW = 800; canvasH = 600;
  zoom = signal(1); panX = signal(0); panY = signal(0);
  canvasTransform = computed(() => `translate(${this.panX()}px,${this.panY()}px) scale(${this.zoom()})`);
  activeTool = signal<string>('select');

  toolGroups = [
    [{id:'select',icon:'mouse-pointer-2',label:'Select',shortcut:'S'},{id:'node',icon:'edit-3',label:'Node',shortcut:'N'}],
    [{id:'rect',icon:'square',label:'Rectangle',shortcut:'R'},{id:'circle',icon:'circle',label:'Circle',shortcut:'C'},{id:'ellipse',icon:'circle-dashed',label:'Ellipse',shortcut:'E'},{id:'star',icon:'star',label:'Star',shortcut:'*'},{id:'line',icon:'minus',label:'Line',shortcut:'L'},{id:'bezier',icon:'pen-tool',label:'Bezier',shortcut:'B'}],
    [{id:'text',icon:'type',label:'Text',shortcut:'T'}],
    [{id:'zoom',icon:'zoom-in',label:'Zoom',shortcut:'Z'},{id:'pan',icon:'hand',label:'Pan',shortcut:'P'}]
  ];

  objects = signal<InkObject[]>([]);
  layers = signal<InkLayer[]>([]);
  activeLayerId = signal('');
  selection = signal<string[]>([]);
  visibleObjects = computed(() => this.objects().filter(o => { const l=this.layers().find(x=>x.id===o.layerId); return o.visible&&(l?.visible??true); }));
  activeLayerObjs = computed(() => this.objects().filter(o=>o.layerId===this.activeLayerId()));
  get selObj(): InkObject|undefined { const ids=this.selection(); return ids.length===1?this.objects().find(o=>o.id===ids[0]):undefined; }

  toolOptRx=0; starPoints=5; starRatio=.5;
  textFont='Arial, sans-serif'; textSize=24; textBold=false; textItalic=false;
  fillType:'flat'|'none'='flat';
  curFill: InkColor = defaultFill();
  curStroke: InkStroke = defaultStroke();
  palette = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#f43f5e','#84cc16','#06b6d4','#8b5cf6','#d946ef','#f59e0b','#10b981','#ffffff','#d1d5db','#9ca3af','#6b7280','#374151','#1f2937','#111827','#000000'];

  isDrawing=false; dStart={x:0,y:0}; drawPrev: any=null; bezPts: {x:number;y:number}[]=[];
  isDragObj=false; isDragSel=false; isResizing=false; resizeH='';
  dMouse={x:0,y:0}; dObj: Partial<InkObject>={};
  rbStart={x:0,y:0}; rbEnd={x:0,y:0};
  isPan=false; panS={x:0,y:0};

  history: InkObject[][]=[];  histStep=-1;
  activePanel='fill';
  panelTabs=[{id:'fill',label:'Style'},{id:'layers',label:'Layers'},{id:'xml',label:'XML'},{id:'files',label:'Files'}];
  showGrid=true; snapToGrid=true; gridSize=10;
  cur={x:0,y:0};
  textInputOpen=false; textPos={x:0,y:0}; textVal=''; showTextModal=false;
  openInkModal=false; xmlStr=''; projectTitle='Untitled';
  savedProjects = signal<InkProject[]>([]);

  // Electron / Inkscape integration
  readonly electronSvc = inject(ElectronService);
  inkStatus = signal<'idle'|'checking'|'opening'|'downloading'|'installing'|'done'|'error'>('idle');
  inkStatusMsg = signal('');
  inkDownloadPct = signal(0);
  inkIsElectron = this.electronSvc.isElectron;

  menus = [
    {label:'File',items:[{label:'New',shortcut:'Ctrl+N',action:()=>this.newProject()},{label:'Save',shortcut:'Ctrl+S',action:()=>this.saveProject()},{label:'Export SVG',action:()=>this.exportSVG()},{label:'Export PNG',action:()=>this.exportPNG()},{label:'Import SVG...',action:()=>this.importFile(),separator:true}]},
    {label:'Edit',items:[{label:'Undo',shortcut:'Ctrl+Z',action:()=>this.undo()},{label:'Redo',shortcut:'Ctrl+Y',action:()=>this.redo()},{label:'Select All',shortcut:'Ctrl+A',action:()=>this.selectAll()},{label:'Delete',shortcut:'Del',action:()=>this.delSelected(),separator:true},{label:'Duplicate',shortcut:'Ctrl+D',action:()=>this.dupSelected()}]},
    {label:'View',items:[{label:'Toggle Grid',shortcut:'#',action:()=>{this.showGrid=!this.showGrid}},{label:'Toggle Snap',shortcut:'%',action:()=>{this.snapToGrid=!this.snapToGrid}},{label:'Zoom In',shortcut:'+',action:()=>this.zoomIn()},{label:'Zoom Out',shortcut:'-',action:()=>this.zoomOut()},{label:'Fit Page',shortcut:'3',action:()=>this.fitPage()}]},
    {label:'Object',items:[{label:'Bring to Front',action:()=>this.toFront()},{label:'Send to Back',action:()=>this.toBack()},{label:'Duplicate',shortcut:'Ctrl+D',action:()=>this.dupSelected()}]}
  ];

  ngOnInit(){
    this.loadProjects();
    this.addLayer('Layer 1');
    this.saveHist();
    this.updateXml();
    // Auto-detect Inkscape if running in Electron
    if (this.electronSvc.isElectron) {
      this.electronSvc.detectInkscape();
    }
  }
  ngAfterViewInit(){setTimeout(()=>this.fitPage(),150);}
  ngOnDestroy(){ this.electronSvc.cleanup(); }

  addLayer(name?:string){const l:InkLayer={id:uid(),name:name||`Layer ${this.layers().length+1}`,visible:true,locked:false,opacity:1};this.layers.update(ls=>[...ls,l]);this.activeLayerId.set(l.id);return l;}
  toggleLayerVis(l:InkLayer){l.visible=!l.visible;this.layers.update(ls=>[...ls]);}
  toggleLayerLock(l:InkLayer){l.locked=!l.locked;this.layers.update(ls=>[...ls]);}
  deleteLayer(id:string){if(this.layers().length<=1){alert('Cannot delete only layer');return;}this.layers.update(ls=>ls.filter(l=>l.id!==id));this.objects.update(os=>os.filter(o=>o.layerId!==id));if(this.activeLayerId()===id)this.activeLayerId.set(this.layers()[0].id);this.saveHist();}

  mkObj(p:Partial<InkObject>):InkObject{return{id:uid(),type:'rect',x:0,y:0,width:100,height:100,fill:{...this.curFill},stroke:{...this.curStroke,color:{...this.curStroke.color}},opacity:1,rotation:0,layerId:this.activeLayerId(),locked:false,visible:true,...p};}
  addObject(o:InkObject){this.objects.update(os=>[...os,o]);this.selection.set([o.id]);this.saveHist();this.updateXml();}
  deleteObject(id:string){this.objects.update(os=>os.filter(o=>o.id!==id));this.selection.update(s=>s.filter(x=>x!==id));this.saveHist();this.updateXml();}
  delSelected(){const s=this.selection();this.objects.update(os=>os.filter(o=>!s.includes(o.id)));this.selection.set([]);this.saveHist();this.updateXml();}
  dupSelected(){const s=this.selection();const nids:string[]=[];this.objects.update(os=>{const c:InkObject[]=[];s.forEach(id=>{const o=os.find(x=>x.id===id);if(o){const cp={...o,id:uid(),x:o.x+15,y:o.y+15};c.push(cp);nids.push(cp.id);}});return[...os,...c];});this.selection.set(nids);this.saveHist();}
  selectAll(){this.selection.set(this.activeLayerObjs().map(o=>o.id));}
  selectObjFn(id:string,e?:MouseEvent){if(e?.shiftKey)this.selection.update(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);else this.selection.set([id]);}
  isSelected(id:string){return this.selection().includes(id);}
  getObj(id:string){return this.objects().find(o=>o.id===id);}
  refreshSvg(){this.objects.update(os=>[...os]);this.updateXml();}
  getObjTransform(o:InkObject){if(!o.rotation)return'';return`rotate(${o.rotation} ${o.x+o.width/2} ${o.y+o.height/2})`;}
  toFront(){const s=this.selection();this.objects.update(os=>[...os.filter(o=>!s.includes(o.id)),...os.filter(o=>s.includes(o.id))]);}
  toBack(){const s=this.selection();this.objects.update(os=>[...os.filter(o=>s.includes(o.id)),...os.filter(o=>!s.includes(o.id))]);}
  applyFill(){const f=this.fillType==='none'?{r:0,g:0,b:0,a:0}:{...this.curFill};this.selection().forEach(id=>{const o=this.getObj(id);if(o)o.fill=f;});this.refreshSvg();}
  applyStroke(){this.selection().forEach(id=>{const o=this.getObj(id);if(o)o.stroke={...this.curStroke,color:{...this.curStroke.color}};});this.refreshSvg();}

  svgPt(e:MouseEvent){const r=this.wrapperRef.nativeElement.getBoundingClientRect();let x=(e.clientX-r.left-this.panX())/this.zoom(),y=(e.clientY-r.top-this.panY())/this.zoom();if(this.snapToGrid){x=Math.round(x/this.gridSize)*this.gridSize;y=Math.round(y/this.gridSize)*this.gridSize;}return{x,y};}

  onMouseDown(e:MouseEvent){
    if(e.button===1||(e.button===0&&this.activeTool()==='pan')){this.isPan=true;this.panS={x:e.clientX-this.panX(),y:e.clientY-this.panY()};return;}
    if(e.button!==0)return;
    const pt=this.svgPt(e);const t=this.activeTool();
    if(t==='zoom'){e.shiftKey?this.zoomOut():this.zoomIn();return;}
    if(t==='select'){this.selection.set([]);this.isDragSel=true;this.rbStart=this.rbEnd=pt;return;}
    if(t==='text'){this.textPos=pt;this.textVal='';this.showTextModal=true;return;}
    if(t==='bezier'){this.bezPts.push(pt);if(e.detail===2)this.commitBezier();return;}
    this.isDrawing=true;this.dStart=pt;
  }

  onMouseMove(e:MouseEvent){
    const pt=this.svgPt(e);this.cur=pt;
    if(this.isPan){this.panX.set(e.clientX-this.panS.x);this.panY.set(e.clientY-this.panS.y);return;}
    if(this.isDragObj&&this.selObj){
      const dx=pt.x-this.dMouse.x,dy=pt.y-this.dMouse.y;const o=this.selObj;
      o.x=(this.dObj.x??0)+dx;o.y=(this.dObj.y??0)+dy;
      if(o.type==='circle'||o.type==='ellipse'){o.cx=o.x+o.width/2;o.cy=o.y+o.height/2;}
      if(o.type==='line'){o.x1=(this.dObj.x1??0)+dx;o.y1=(this.dObj.y1??0)+dy;o.x2=(this.dObj.x2??0)+dx;o.y2=(this.dObj.y2??0)+dy;}
      this.refreshSvg();return;
    }
    if(this.isResizing&&this.selObj){this.doResize(pt);return;}
    if(this.isDragSel){this.rbEnd=pt;return;}
    if(!this.isDrawing)return;
    const s=this.dStart;const t=this.activeTool();
    if(t==='rect')this.drawPrev={type:'rect',x:Math.min(s.x,pt.x),y:Math.min(s.y,pt.y),w:Math.abs(pt.x-s.x),h:Math.abs(pt.y-s.y)};
    else if(t==='circle'){const r=Math.sqrt(Math.pow(pt.x-s.x,2)+Math.pow(pt.y-s.y,2));this.drawPrev={type:'circle',cx:s.x,cy:s.y,r};}
    else if(t==='ellipse')this.drawPrev={type:'ellipse',cx:s.x,cy:s.y,rx:Math.abs(pt.x-s.x),ry:Math.abs(pt.y-s.y)};
    else if(t==='line')this.drawPrev={type:'line',x1:s.x,y1:s.y,x2:pt.x,y2:pt.y};
    else if(t==='star')this.drawPrev={type:'star',pts:this.calcStar(s,pt)};
  }

  onMouseUp(e:MouseEvent){
    if(this.isPan){this.isPan=false;return;}
    if(this.isDragObj){this.isDragObj=false;this.saveHist();this.updateXml();return;}
    if(this.isResizing){this.isResizing=false;this.saveHist();this.updateXml();return;}
    if(this.isDragSel){
      this.isDragSel=false;
      const mnX=Math.min(this.rbStart.x,this.rbEnd.x),mxX=Math.max(this.rbStart.x,this.rbEnd.x);
      const mnY=Math.min(this.rbStart.y,this.rbEnd.y),mxY=Math.max(this.rbStart.y,this.rbEnd.y);
      if(mxX-mnX>3||mxY-mnY>3)this.selection.set(this.activeLayerObjs().filter(o=>o.x+o.width>=mnX&&o.x<=mxX&&o.y+o.height>=mnY&&o.y<=mxY).map(o=>o.id));
      return;
    }
    if(!this.isDrawing)return;
    this.isDrawing=false;
    const pt=this.svgPt(e);const s=this.dStart;const t=this.activeTool();
    if(t==='rect'){const w=Math.abs(pt.x-s.x),h=Math.abs(pt.y-s.y);if(w<2&&h<2)return;this.addObject(this.mkObj({type:'rect',x:Math.min(s.x,pt.x),y:Math.min(s.y,pt.y),width:w||10,height:h||10}));}
    else if(t==='circle'){const r=Math.max(5,Math.sqrt(Math.pow(pt.x-s.x,2)+Math.pow(pt.y-s.y,2)));this.addObject(this.mkObj({type:'circle',cx:s.x,cy:s.y,x:s.x-r,y:s.y-r,width:r*2,height:r*2,rx:r}));}
    else if(t==='ellipse'){const rx=Math.abs(pt.x-s.x),ry=Math.abs(pt.y-s.y);if(rx<2&&ry<2)return;this.addObject(this.mkObj({type:'ellipse',cx:s.x,cy:s.y,rx,ry,x:s.x-rx,y:s.y-ry,width:rx*2,height:ry*2}));}
    else if(t==='line'){const dx=pt.x-s.x,dy=pt.y-s.y;if(Math.abs(dx)<2&&Math.abs(dy)<2)return;this.addObject(this.mkObj({type:'line',x1:s.x,y1:s.y,x2:pt.x,y2:pt.y,x:Math.min(s.x,pt.x),y:Math.min(s.y,pt.y),width:Math.abs(dx),height:Math.abs(dy),fill:{r:0,g:0,b:0,a:0}}));}
    else if(t==='star'){const pts=this.calcStar(s,pt);if(!pts)return;const bb=this.pBBox(pts);this.addObject(this.mkObj({type:'star',points:pts,x:bb.x,y:bb.y,width:bb.w,height:bb.h}));}
    this.drawPrev=null;
  }

  onObjDown(e:MouseEvent,obj:InkObject){
    if(this.activeTool()!=='select')return;e.stopPropagation();
    const layer=this.layers().find(l=>l.id===obj.layerId);if(layer?.locked||obj.locked)return;
    this.selectObjFn(obj.id,e);
    const pt=this.svgPt(e);this.isDragObj=true;this.dMouse=pt;this.dObj={...obj,x1:obj.x1,y1:obj.y1,x2:obj.x2,y2:obj.y2};
  }

  getHandles(o:InkObject){const{x,y,width:w,height:h}=o;return[{pos:'nw',x,y},{pos:'n',x:x+w/2,y},{pos:'ne',x:x+w,y},{pos:'e',x:x+w,y:y+h/2},{pos:'se',x:x+w,y:y+h},{pos:'s',x:x+w/2,y:y+h},{pos:'sw',x,y:y+h},{pos:'w',x,y:y+h/2}];}
  onHandleDown(e:MouseEvent,obj:InkObject,pos:string){e.stopPropagation();this.isResizing=true;this.resizeH=pos;this.dMouse=this.svgPt(e);this.dObj={x:obj.x,y:obj.y,width:obj.width,height:obj.height};}
  doResize(pt:{x:number;y:number}){
    const o=this.selObj;if(!o)return;
    const sx=this.dObj.x??o.x,sy=this.dObj.y??o.y,sw=this.dObj.width??o.width,sh=this.dObj.height??o.height;
    const dx=pt.x-this.dMouse.x,dy=pt.y-this.dMouse.y;const h=this.resizeH;
    if(h.includes('e'))o.width=Math.max(1,sw+dx);if(h.includes('s'))o.height=Math.max(1,sh+dy);
    if(h.includes('w')){o.x=sx+dx;o.width=Math.max(1,sw-dx);}if(h.includes('n')){o.y=sy+dy;o.height=Math.max(1,sh-dy);}
    if(o.type==='circle'){o.cx=o.x+o.width/2;o.cy=o.y+o.height/2;o.rx=Math.min(o.width,o.height)/2;}
    if(o.type==='ellipse'){o.cx=o.x+o.width/2;o.cy=o.y+o.height/2;o.rx=o.width/2;o.ry=o.height/2;}
    this.refreshSvg();
  }

  @HostListener('keydown',['$event'])
  onKeyDown(e:KeyboardEvent){
    const t=e.target as HTMLElement;if(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')return;
    if(e.ctrlKey){switch(e.key){case'z':e.preventDefault();this.undo();break;case'y':e.preventDefault();this.redo();break;case'a':e.preventDefault();this.selectAll();break;case'd':e.preventDefault();this.dupSelected();break;case's':e.preventDefault();this.saveProject();break;}return;}
    switch(e.key){
      case'Delete':case'Backspace':this.delSelected();break;
      case's':case'S':this.setTool('select');break;case'r':case'R':this.setTool('rect');break;case'c':case'C':this.setTool('circle');break;
      case'e':case'E':this.setTool('ellipse');break;case'l':case'L':this.setTool('line');break;case'b':case'B':this.setTool('bezier');break;
      case't':case'T':this.setTool('text');break;case'z':case'Z':this.setTool('zoom');break;
      case'+':case'=':this.zoomIn();break;case'-':this.zoomOut();break;case'3':this.fitPage();break;
      case'#':this.showGrid=!this.showGrid;break;case'%':this.snapToGrid=!this.snapToGrid;break;
      case'Escape':this.selection.set([]);this.bezPts=[];this.drawPrev=null;break;
      case'ArrowLeft':this.nudge(-1,0,e.shiftKey);break;case'ArrowRight':this.nudge(1,0,e.shiftKey);break;
      case'ArrowUp':this.nudge(0,-1,e.shiftKey);e.preventDefault();break;case'ArrowDown':this.nudge(0,1,e.shiftKey);e.preventDefault();break;
    }
  }
  nudge(dx:number,dy:number,big:boolean){const s=big?10:1;this.selection().forEach(id=>{const o=this.getObj(id);if(o){o.x+=dx*s;o.y+=dy*s;}});this.refreshSvg();}

  onWheel(e:WheelEvent){e.preventDefault();if(e.ctrlKey){const f=e.deltaY<0?1.1:.9;this.zoom.update(z=>Math.max(.1,Math.min(10,z*f)));}else{this.panX.update(p=>p-e.deltaX);this.panY.update(p=>p-e.deltaY);}}

  setTool(t:string){this.activeTool.set(t);}
  zoomIn(){this.zoom.update(z=>Math.min(10,z*1.2));}
  zoomOut(){this.zoom.update(z=>Math.max(.1,z/1.2));}
  resetZoom(){this.zoom.set(1);}
  setZoom(v:number){this.zoom.set(Math.max(.1,Math.min(10,v)));}
  fitPage(){const wr=this.wrapperRef?.nativeElement;if(!wr)return;const r=wr.getBoundingClientRect();const z=Math.min((r.width-60)/this.canvasW,(r.height-60)/this.canvasH,2);this.zoom.set(z);this.panX.set((r.width-this.canvasW*z)/2);this.panY.set((r.height-this.canvasH*z)/2);}

  commitBezier(){if(this.bezPts.length<2){this.bezPts=[];return;}const pts=this.bezPts;const d='M '+pts.map(p=>p.x+' '+p.y).join(' L ');const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);const bx=Math.min(...xs),by=Math.min(...ys);this.addObject(this.mkObj({type:'path',d,x:bx,y:by,width:Math.max(...xs)-bx,height:Math.max(...ys)-by}));this.bezPts=[];}
  commitText(e?:Event){if(e)e.preventDefault();if(!this.textVal.trim()){this.textInputOpen=false;return;}this.addObject(this.mkObj({type:'text',x:this.textPos.x,y:this.textPos.y,width:this.textVal.length*this.textSize*.6,height:this.textSize*1.4,content:this.textVal,fontSize:this.textSize,fontFamily:this.textFont,fontWeight:this.textBold?'bold':'normal',stroke:{...this.curStroke,width:0,color:{...this.curStroke.color}}}));this.textInputOpen=false;this.textVal='';}
  commitTextModal(){if(!this.textVal.trim()){this.showTextModal=false;return;}this.addObject(this.mkObj({type:'text',x:this.textPos.x||100,y:this.textPos.y||100,width:this.textVal.length*this.textSize*.6,height:this.textSize*1.4,content:this.textVal,fontSize:this.textSize,fontFamily:this.textFont,fontWeight:this.textBold?'bold':'normal',stroke:{...this.curStroke,width:0,color:{...this.curStroke.color}}}));this.showTextModal=false;this.textVal='';}

  calcStar(c:{x:number;y:number},e:{x:number;y:number}):string{const n=this.starPoints;const oR=Math.sqrt(Math.pow(e.x-c.x,2)+Math.pow(e.y-c.y,2));if(oR<3)return'';const iR=oR*this.starRatio;const pts:string[]=[];for(let i=0;i<n*2;i++){const r=i%2===0?oR:iR;const a=(Math.PI/n)*i-Math.PI/2;pts.push(`${c.x+r*Math.cos(a)},${c.y+r*Math.sin(a)}`);}return pts.join(' ');}
  pBBox(s:string){const pairs=s.split(' ').map(p=>p.split(',').map(Number));const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]);const minX=Math.min(...xs),minY=Math.min(...ys);return{x:minX,y:minY,w:Math.max(...xs)-minX,h:Math.max(...ys)-minY};}

  saveHist(){if(this.histStep<this.history.length-1)this.history=this.history.slice(0,this.histStep+1);this.history.push(JSON.parse(JSON.stringify(this.objects())));if(this.history.length>50)this.history.shift();else this.histStep++;}
  undo(){if(this.histStep<=0)return;this.histStep--;this.objects.set(JSON.parse(JSON.stringify(this.history[this.histStep])));this.selection.set([]);this.updateXml();}
  redo(){if(this.histStep>=this.history.length-1)return;this.histStep++;this.objects.set(JSON.parse(JSON.stringify(this.history[this.histStep])));this.updateXml();}

  updateXml(){this.xmlStr=this.buildSvg();}
  buildSvg():string{const objs=this.objects().map(o=>this.o2svg(o)).join('\n  ');return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvasW}" height="${this.canvasH}" viewBox="0 0 ${this.canvasW} ${this.canvasH}">\n  ${objs}\n</svg>`;}
  o2svg(o:InkObject):string{
    const f=o.fill.a===0?'none':colorToCss(o.fill);const sc=o.stroke.width===0?'none':colorToCss(o.stroke.color);const sw=o.stroke.width;
    const dash=o.stroke.dash?` stroke-dasharray="${o.stroke.dash}"`:''
    const tr=o.rotation?` transform="rotate(${o.rotation} ${o.x+o.width/2} ${o.y+o.height/2})"`:''
    switch(o.type){
      case'rect':return `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" rx="${this.toolOptRx}" fill="${f}" stroke="${sc}" stroke-width="${sw}"${dash}${tr}/>`;
      case'circle':return `<circle cx="${o.cx??o.x+o.width/2}" cy="${o.cy??o.y+o.height/2}" r="${o.rx??o.width/2}" fill="${f}" stroke="${sc}" stroke-width="${sw}"${tr}/>`;
      case'ellipse':return `<ellipse cx="${o.cx??o.x+o.width/2}" cy="${o.cy??o.y+o.height/2}" rx="${o.rx??o.width/2}" ry="${o.ry??o.height/2}" fill="${f}" stroke="${sc}" stroke-width="${sw}"${tr}/>`;
      case'line':return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${sc}" stroke-width="${sw}"${dash}${tr}/>`;
      case'path':return `<path d="${o.d}" fill="${f}" stroke="${sc}" stroke-width="${sw}"${dash}/>`;
      case'text':return `<text x="${o.x}" y="${o.y+(o.fontSize??24)}" font-size="${o.fontSize??24}" font-family="${o.fontFamily??'sans-serif'}" font-weight="${o.fontWeight??'normal'}" fill="${f}">${o.content}</text>`;
      case'polygon':case'star':return `<polygon points="${o.points}" fill="${f}" stroke="${sc}" stroke-width="${sw}"${tr}/>`;
      default:return'';
    }
  }

  importXml(){try{const p=new DOMParser();const doc=p.parseFromString(this.xmlStr,'image/svg+xml');const s=doc.querySelector('svg');if(!s){alert('Invalid SVG');return;}this.parseSvgEl(s);}catch{alert('Failed to parse');}}
  exportSVG(){const b=new Blob([this.buildSvg()],{type:'image/svg+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=this.projectTitle+'.svg';a.click();}
  exportPNG(){const sv=this.buildSvg();const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=this.canvasW;c.height=this.canvasH;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,this.canvasW,this.canvasH);ctx.drawImage(img,0,0);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=this.projectTitle+'.png';a.click();};img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(sv)));}
  importFile(){this.fileInputRef.nativeElement.click();}
  onFileImp(e:Event){const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{const t=ev.target?.result as string;const p=new DOMParser();const doc=p.parseFromString(t,'image/svg+xml');const s=doc.querySelector('svg');if(!s){alert('Invalid SVG');return;}this.parseSvgEl(s);};r.readAsText(f);}

  parseSvgEl(s:Element){
    const w=parseFloat(s.getAttribute('width')??'800'),h=parseFloat(s.getAttribute('height')??'600');
    if(!isNaN(w)&&!isNaN(h)){this.canvasW=w;this.canvasH=h;}
    const newObjs:InkObject[]=[]; const lid=this.activeLayerId();
    s.querySelectorAll('rect,circle,ellipse,line,path,text,polygon').forEach(el=>{
      const tag=el.tagName.toLowerCase() as any;
      const fill=this.parseSvgColor(el.getAttribute('fill')??'#0000ff');
      const stroke=this.parseSvgColor(el.getAttribute('stroke')??'#000000');
      const sw=parseFloat(el.getAttribute('stroke-width')??'1');
      const base:Partial<InkObject>={id:uid(),type:tag,layerId:lid,visible:true,locked:false,fill,stroke:{color:stroke,width:sw,dash:'',linecap:'round',linejoin:'round'},opacity:parseFloat(el.getAttribute('opacity')??'1'),rotation:0};
      if(tag==='rect'){const x=parseFloat(el.getAttribute('x')??'0'),y=parseFloat(el.getAttribute('y')??'0'),w2=parseFloat(el.getAttribute('width')??'100'),h2=parseFloat(el.getAttribute('height')??'100');newObjs.push({...base,type:'rect',x,y,width:w2,height:h2} as InkObject);}
      else if(tag==='circle'){const cx=parseFloat(el.getAttribute('cx')??'0'),cy=parseFloat(el.getAttribute('cy')??'0'),r=parseFloat(el.getAttribute('r')??'50');newObjs.push({...base,type:'circle',cx,cy,rx:r,x:cx-r,y:cy-r,width:r*2,height:r*2} as InkObject);}
      else if(tag==='ellipse'){const cx=parseFloat(el.getAttribute('cx')??'0'),cy=parseFloat(el.getAttribute('cy')??'0'),rx=parseFloat(el.getAttribute('rx')??'50'),ry=parseFloat(el.getAttribute('ry')??'50');newObjs.push({...base,type:'ellipse',cx,cy,rx,ry,x:cx-rx,y:cy-ry,width:rx*2,height:ry*2} as InkObject);}
      else if(tag==='line'){const x1=parseFloat(el.getAttribute('x1')??'0'),y1=parseFloat(el.getAttribute('y1')??'0'),x2=parseFloat(el.getAttribute('x2')??'100'),y2=parseFloat(el.getAttribute('y2')??'100');newObjs.push({...base,type:'line',x1,y1,x2,y2,x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)} as InkObject);}
      else if(tag==='path'){const d=el.getAttribute('d')??'';newObjs.push({...base,type:'path',d,x:0,y:0,width:100,height:100} as InkObject);}
      else if(tag==='text'){const x=parseFloat(el.getAttribute('x')??'0'),y=parseFloat(el.getAttribute('y')??'0'),fs=parseFloat(el.getAttribute('font-size')??'16');newObjs.push({...base,type:'text',x,y:y-fs,width:100,height:fs*1.4,content:el.textContent??'',fontSize:fs,fontFamily:el.getAttribute('font-family')??'sans-serif'} as InkObject);}
      else if(tag==='polygon'){const pts=el.getAttribute('points')??'';const bb=this.pBBox(pts);newObjs.push({...base,type:'polygon',points:pts,x:bb.x,y:bb.y,width:bb.w,height:bb.h} as InkObject);}
    });
    this.objects.set(newObjs);this.selection.set([]);this.saveHist();this.updateXml();setTimeout(()=>this.fitPage(),100);
  }
  parseSvgColor(s:string):InkColor{if(!s||s==='none')return{r:0,g:0,b:0,a:0};if(s.startsWith('#'))return hexToColor(s);const m=s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);if(m)return{r:+m[1],g:+m[2],b:+m[3],a:m[4]!==undefined?+m[4]:1};return{r:0,g:0,b:200,a:1};}

  loadProjects(){try{const r=localStorage.getItem('si_projects');if(r)this.savedProjects.set(JSON.parse(r));}catch{}}
  saveProject(){
    const sv=this.buildSvg();const b64='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(sv)));
    const doSave=(thumb?:string)=>{const p:InkProject={id:'p_'+Date.now(),title:this.projectTitle,objects:JSON.parse(JSON.stringify(this.objects())),layers:JSON.parse(JSON.stringify(this.layers())),canvasW:this.canvasW,canvasH:this.canvasH,savedAt:Date.now(),thumbnail:thumb};this.savedProjects.update(ps=>{const i=ps.findIndex(x=>x.title===p.title);if(i>=0){const a=[...ps];a[i]=p;return a;}return[...ps,p];});try{localStorage.setItem('si_projects',JSON.stringify(this.savedProjects()));}catch{}};
    const img=new Image();img.onload=()=>{try{const c=document.createElement('canvas');c.width=200;c.height=120;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,200,120);ctx.drawImage(img,0,0,200,120);doSave(c.toDataURL('image/jpeg',.6));}catch{doSave();}};img.onerror=()=>doSave();img.src=b64;
  }
  loadProject(p:InkProject){this.objects.set(JSON.parse(JSON.stringify(p.objects)));this.layers.set(JSON.parse(JSON.stringify(p.layers)));if(this.layers().length>0)this.activeLayerId.set(this.layers()[0].id);this.canvasW=p.canvasW;this.canvasH=p.canvasH;this.projectTitle=p.title;this.selection.set([]);this.saveHist();this.updateXml();setTimeout(()=>this.fitPage(),100);}
  newProject(){if(this.objects().length>0&&!confirm('Start new project? Unsaved changes will be lost.'))return;this.objects.set([]);this.selection.set([]);this.projectTitle='Untitled';this.history=[];this.histStep=-1;this.saveHist();this.updateXml();}
  fmtDate(ts:number):string{return new Date(ts).toLocaleDateString();}
  objIcon(t:string):string{const m:Record<string,string>={rect:'square',circle:'circle',ellipse:'circle-dashed',line:'minus',path:'pen-tool',text:'type',polygon:'pentagon',star:'star'};return m[t]??'box';}

  // ─── Electron / Real Inkscape ───────────────────────────────────────────────

  async openInRealInkscape(): Promise<void> {
    const svg = this.buildSvg();

    if (!this.inkIsElectron) {
      // Web fallback: download SVG so user can open manually
      this.exportSVG();
      this.openInkModal = true;
      return;
    }

    this.inkStatus.set('opening');
    this.inkStatusMsg.set('جاري فتح الملف في Inkscape...');
    this.openInkModal = true;

    const result = await this.electronSvc.openSvgWithSync(
      svg,
      (newContent: string) => {
        // Auto-import when user saves in Inkscape
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(newContent, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            this.parseSvgEl(svgEl);
            this.inkStatusMsg.set('✅ تم استيراد التغييرات من Inkscape');
          }
        } catch { /* ignore */ }
      },
      `${this.projectTitle}.svg`
    );

    if (result.ok) {
      this.inkStatus.set('done');
      this.inkStatusMsg.set('✅ Inkscape مفتوح - التغييرات تُستورد تلقائياً عند الحفظ');
    } else {
      // Not installed — offer download
      this.inkStatus.set('error');
      this.inkStatusMsg.set('❌ Inkscape غير مثبت');
    }
  }

  async downloadInkscape(): Promise<void> {
    this.inkStatus.set('downloading');
    this.inkDownloadPct.set(0);
    this.inkStatusMsg.set('جاري التحميل...');

    const ok = await this.electronSvc.downloadInkscape();
    if (ok) {
      this.inkStatus.set('done');
      this.inkStatusMsg.set('✅ تم تثبيت Inkscape! يمكنك الآن فتح الملفات مباشرة.');
    } else {
      this.inkStatus.set('error');
      this.inkStatusMsg.set('❌ فشل التثبيت. تحقق من الاتصال بالإنترنت.');
    }
  }
}
