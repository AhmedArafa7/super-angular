import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, ViewChild, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Paintbrush, Eraser, PaintBucket, Square, Circle, Triangle, Star, ArrowUpRight, Type, Move, ZoomIn, ZoomOut, RotateCcw, Undo2, Redo2, Layers, Eye, EyeOff, Lock, Unlock, Plus, Trash2, Download, Image as ImageIcon, Sparkles, FolderOpen, Save, Grid, Palette, ChevronUp, ChevronDown, Check, X, Maximize2, HelpCircle } from 'lucide-angular';
import { ToolType, CanvasBackground, CanvasLayer, BrushSettings, COLOR_PALETTES, DrawProject, SavedLayerData, Point } from './draw.model';
import { DrawService } from './draw.service';

@Component({
  selector: 'app-draw',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './draw.component.html',
  styleUrls: ['./draw.component.scss']
})
export class DrawComponent implements OnInit, AfterViewInit, OnDestroy {
  drawService = inject(DrawService);
  Math = Math;

  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('previewCanvas', { static: false }) previewCanvasRef!: ElementRef<HTMLCanvasElement>;

  // Canvas Resolution
  canvasWidth = 1280;
  canvasHeight = 720;

  // Viewport / Pan & Zoom
  scale = signal<number>(1);
  panX = signal<number>(0);
  panY = signal<number>(0);
  isPanning = false;
  startPanPoint: Point = { x: 0, y: 0 };

  // Current Active State
  activeTool = signal<ToolType>('pencil');
  background = signal<CanvasBackground>('dark');
  activeLayerId = signal<string>('');
  
  // Layers
  layers = signal<CanvasLayer[]>([]);

  // Brush Settings
  brush = signal<BrushSettings>({
    size: 6,
    opacity: 1,
    color: '#6366f1',
    fillColor: '#3b82f6',
    isFilled: false,
    fontSize: 28,
    fontFamily: 'Tajawal, sans-serif',
    smoothing: true
  });

  // Color Palettes
  palettes = COLOR_PALETTES;
  recentColors = signal<string[]>(['#ffffff', '#000000', '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444']);

  // History Undo/Redo
  private historyStack: { layerId: string; imageData: ImageData }[][] = [];
  private historyStep = -1;
  private readonly maxHistory = 30;

  // Drawing State
  isDrawing = false;
  startPoint: Point = { x: 0, y: 0 };
  currentPath: Point[] = [];

  // Text Input Modal / Overlay State
  textInputOpen = false;
  textInputPos: Point = { x: 0, y: 0 };
  textInputValue = '';

  // Gallery & Dialogs
  showGallery = false;
  showHelpModal = false;
  showExportModal = false;
  currentProjectTitle = 'لوحة رسم جديدة';
  currentProjectId: string | null = null;
  isSaving = false;

  // Icons
  Pencil = Pencil;
  Paintbrush = Paintbrush;
  Eraser = Eraser;
  PaintBucket = PaintBucket;
  Square = Square;
  Circle = Circle;
  Triangle = Triangle;
  Star = Star;
  ArrowUpRight = ArrowUpRight;
  Type = Type;
  Move = Move;
  ZoomIn = ZoomIn;
  ZoomOut = ZoomOut;
  RotateCcw = RotateCcw;
  Undo2 = Undo2;
  Redo2 = Redo2;
  Layers = Layers;
  Eye = Eye;
  EyeOff = EyeOff;
  Lock = Lock;
  Unlock = Unlock;
  Plus = Plus;
  Trash2 = Trash2;
  Download = Download;
  ImageIcon = ImageIcon;
  Sparkles = Sparkles;
  FolderOpen = FolderOpen;
  Save = Save;
  Grid = Grid;
  Palette = Palette;
  ChevronUp = ChevronUp;
  ChevronDown = ChevronDown;
  Check = Check;
  X = X;
  Maximize2 = Maximize2;
  HelpCircle = HelpCircle;

  ngOnInit() {
    // Initial setup
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCanvasWorkspace();
    }, 100);
  }

  ngOnDestroy() {
    // Clean up layer elements if needed
  }

  initCanvasWorkspace() {
    if (this.layers().length === 0) {
      this.addLayer('الطبقة الرئيسية (Layer 1)');
    }
    this.centerCanvas();
    this.saveState();
  }

  // --- Layer Management ---
  addLayer(name?: string): CanvasLayer {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return {} as CanvasLayer;

    const layerId = 'layer_' + Math.random().toString(36).substring(2, 9);
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.id = layerId;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Insert layer before preview canvas
    const previewEl = this.previewCanvasRef?.nativeElement;
    if (previewEl && previewEl.parentNode) {
      previewEl.parentNode.insertBefore(canvas, previewEl);
    } else {
      container.appendChild(canvas);
    }

    const newLayer: CanvasLayer = {
      id: layerId,
      name: name || `طبقة ${this.layers().length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      canvas,
      ctx
    };

    const updatedLayers = [...this.layers(), newLayer];
    this.layers.set(updatedLayers);
    this.activeLayerId.set(layerId);

    return newLayer;
  }

  selectLayer(id: string) {
    this.activeLayerId.set(id);
  }

  toggleLayerVisibility(layer: CanvasLayer, event: MouseEvent) {
    event.stopPropagation();
    layer.visible = !layer.visible;
    layer.canvas.style.display = layer.visible ? 'block' : 'none';
  }

  toggleLayerLock(layer: CanvasLayer, event: MouseEvent) {
    event.stopPropagation();
    layer.locked = !layer.locked;
  }

  deleteLayer(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.layers().length <= 1) {
      alert('يجب أن تحتوي اللوحة على طبقة واحدة على الأقل!');
      return;
    }
    const layerToDelete = this.layers().find(l => l.id === id);
    if (layerToDelete) {
      layerToDelete.canvas.remove();
    }

    const updated = this.layers().filter(l => l.id !== id);
    this.layers.set(updated);

    if (this.activeLayerId() === id) {
      this.activeLayerId.set(updated[updated.length - 1].id);
    }
    this.saveState();
  }

  moveLayerUp(index: number, event: MouseEvent) {
    event.stopPropagation();
    if (index >= this.layers().length - 1) return;
    const current = [...this.layers()];
    const temp = current[index];
    current[index] = current[index + 1];
    current[index + 1] = temp;
    this.layers.set(current);
    this.reorderCanvasDOM();
  }

  moveLayerDown(index: number, event: MouseEvent) {
    event.stopPropagation();
    if (index <= 0) return;
    const current = [...this.layers()];
    const temp = current[index];
    current[index] = current[index - 1];
    current[index - 1] = temp;
    this.layers.set(current);
    this.reorderCanvasDOM();
  }

  setLayerOpacity(layer: CanvasLayer, opacity: number) {
    layer.opacity = opacity;
    layer.canvas.style.opacity = opacity.toString();
  }

  reorderCanvasDOM() {
    const previewEl = this.previewCanvasRef?.nativeElement;
    if (!previewEl || !previewEl.parentNode) return;
    
    this.layers().forEach(layer => {
      previewEl.parentNode!.insertBefore(layer.canvas, previewEl);
    });
  }

  get activeLayer(): CanvasLayer | undefined {
    return this.layers().find(l => l.id === this.activeLayerId());
  }

  // --- Zoom & Pan ---
  centerCanvas() {
    if (!this.canvasContainer) return;
    const parent = this.canvasContainer.nativeElement.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.scale.set(Math.min((rect.width - 80) / this.canvasWidth, (rect.height - 80) / this.canvasHeight, 1));
      this.panX.set((rect.width - this.canvasWidth * this.scale()) / 2);
      this.panY.set((rect.height - this.canvasHeight * this.scale()) / 2);
    }
  }

  zoomIn() {
    this.scale.update(s => Math.min(s * 1.2, 5));
  }

  zoomOut() {
    this.scale.update(s => Math.max(s / 1.2, 0.15));
  }

  resetZoom() {
    this.centerCanvas();
  }

  // --- Color Selection ---
  selectColor(color: string) {
    this.brush.update(b => ({ ...b, color }));
    this.addRecentColor(color);
  }

  addRecentColor(color: string) {
    const list = this.recentColors();
    if (!list.includes(color)) {
      this.recentColors.set([color, ...list.slice(0, 11)]);
    }
  }

  async openEyedropper() {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          this.selectColor(result.sRGBHex);
        }
      } catch (e) {
        console.log('Eyedropper cancelled or failed', e);
      }
    } else {
      alert('خاصية قطارة الألوان غير مدعومة مباشرة في متصفحك.');
    }
  }

  // --- Pointer & Mouse Handling ---
  onPointerDown(event: PointerEvent) {
    const layer = this.activeLayer;
    if (this.activeTool() === 'select' || (event.button === 1 || (event as any).spaceKey || (event.shiftKey && event.buttons === 1))) {
      this.isPanning = true;
      this.startPanPoint = { x: event.clientX - this.panX(), y: event.clientY - this.panY() };
      return;
    }

    if (!layer || !layer.visible || layer.locked) return;

    const coords = this.getCanvasCoordinates(event);
    this.isDrawing = true;
    this.startPoint = coords;
    this.currentPath = [coords];

    const ctx = layer.ctx;
    ctx.save();
    ctx.globalAlpha = this.brush().opacity;

    if (this.activeTool() === 'pencil' || this.activeTool() === 'brush') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = this.brush().color;
      ctx.lineWidth = this.brush().size;

      if (this.activeTool() === 'brush') {
        ctx.shadowColor = this.brush().color;
        ctx.shadowBlur = Math.max(2, this.brush().size / 2);
      }
    } else if (this.activeTool() === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = this.brush().size * 2;
    } else if (this.activeTool() === 'bucket') {
      this.floodFill(layer, Math.round(coords.x), Math.round(coords.y), this.brush().color);
      this.isDrawing = false;
      this.saveState();
    } else if (this.activeTool() === 'text') {
      this.textInputPos = coords;
      this.textInputValue = '';
      this.textInputOpen = true;
      this.isDrawing = false;
    }
  }

  onPointerMove(event: PointerEvent) {
    if (this.isPanning) {
      this.panX.set(event.clientX - this.startPanPoint.x);
      this.panY.set(event.clientY - this.startPanPoint.y);
      return;
    }

    if (!this.isDrawing) return;

    const coords = this.getCanvasCoordinates(event);
    const layer = this.activeLayer;
    if (!layer) return;

    const tool = this.activeTool();

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      const ctx = layer.ctx;
      this.currentPath.push(coords);

      if (this.brush().smoothing && this.currentPath.length > 2) {
        const p1 = this.currentPath[this.currentPath.length - 2];
        const p2 = this.currentPath[this.currentPath.length - 1];
        const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        ctx.stroke();
      } else {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    } else if (['line', 'rectangle', 'circle', 'ellipse', 'triangle', 'star', 'arrow'].includes(tool)) {
      this.renderShapePreview(this.startPoint, coords, tool);
    }
  }

  onPointerUp(event: PointerEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!this.isDrawing) return;

    const coords = this.getCanvasCoordinates(event);
    const layer = this.activeLayer;
    const tool = this.activeTool();

    if (layer && ['line', 'rectangle', 'circle', 'ellipse', 'triangle', 'star', 'arrow'].includes(tool)) {
      // Clear preview
      this.clearPreviewCanvas();
      // Draw actual shape on layer
      this.drawShape(layer.ctx, this.startPoint, coords, tool);
    }

    if (layer) {
      layer.ctx.restore();
    }

    this.isDrawing = false;
    this.currentPath = [];
    this.saveState();
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = 1.1;
    if (event.deltaY < 0) {
      this.scale.update(s => Math.min(s * zoomFactor, 5));
    } else {
      this.scale.update(s => Math.max(s / zoomFactor, 0.15));
    }
  }

  getCanvasCoordinates(event: PointerEvent): Point {
    const container = this.canvasContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale();
    const y = (event.clientY - rect.top) / this.scale();
    return { x, y };
  }

  // --- Shape Rendering ---
  renderShapePreview(start: Point, end: Point, tool: ToolType) {
    const preview = this.previewCanvasRef?.nativeElement;
    if (!preview) return;
    const ctx = preview.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    ctx.save();
    ctx.globalAlpha = this.brush().opacity;
    this.drawShape(ctx, start, end, tool);
    ctx.restore();
  }

  clearPreviewCanvas() {
    const preview = this.previewCanvasRef?.nativeElement;
    if (!preview) return;
    const ctx = preview.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  drawShape(ctx: CanvasRenderingContext2D, start: Point, end: Point, tool: ToolType) {
    ctx.beginPath();
    ctx.strokeStyle = this.brush().color;
    ctx.fillStyle = this.brush().fillColor;
    ctx.lineWidth = this.brush().size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    switch (tool) {
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;

      case 'arrow':
        const headlen = Math.max(10, this.brush().size * 3);
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;

      case 'rectangle':
        if (this.brush().isFilled) {
          ctx.fillRect(start.x, start.y, dx, dy);
        }
        ctx.strokeRect(start.x, start.y, dx, dy);
        break;

      case 'circle':
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        if (this.brush().isFilled) ctx.fill();
        ctx.stroke();
        break;

      case 'ellipse':
        const radiusX = Math.abs(dx);
        const radiusY = Math.abs(dy);
        ctx.ellipse(start.x, start.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (this.brush().isFilled) ctx.fill();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.moveTo(start.x + dx / 2, start.y);
        ctx.lineTo(start.x, end.y);
        ctx.lineTo(end.x, end.y);
        ctx.closePath();
        if (this.brush().isFilled) ctx.fill();
        ctx.stroke();
        break;

      case 'star':
        const spikes = 5;
        const outerRadius = Math.sqrt(dx * dx + dy * dy);
        const innerRadius = outerRadius / 2;
        let rot = (Math.PI / 2) * 3;
        let x = start.x;
        let y = start.y;
        const step = Math.PI / spikes;

        ctx.moveTo(start.x, start.y - outerRadius);
        for (let i = 0; i < spikes; i++) {
          x = start.x + Math.cos(rot) * outerRadius;
          y = start.y + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = start.x + Math.cos(rot) * innerRadius;
          y = start.y + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(start.x, start.y - outerRadius);
        ctx.closePath();
        if (this.brush().isFilled) ctx.fill();
        ctx.stroke();
        break;
    }
  }

  // --- Text Tool ---
  confirmAddText() {
    if (!this.textInputValue.trim()) {
      this.textInputOpen = false;
      return;
    }

    const layer = this.activeLayer;
    if (layer) {
      const ctx = layer.ctx;
      ctx.save();
      ctx.font = `${this.brush().fontSize}px ${this.brush().fontFamily}`;
      ctx.fillStyle = this.brush().color;
      ctx.globalAlpha = this.brush().opacity;
      ctx.fillText(this.textInputValue, this.textInputPos.x, this.textInputPos.y);
      ctx.restore();
      this.saveState();
    }

    this.textInputOpen = false;
    this.textInputValue = '';
  }

  // --- Flood Fill Algorithm ---
  floodFill(layer: CanvasLayer, startX: number, startY: number, fillColorHex: string) {
    const ctx = layer.ctx;
    const imgData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const data = imgData.data;

    const targetColor = this.getPixelColor(data, startX, startY);
    const fillColor = this.hexToRgb(fillColorHex);

    if (this.colorsMatch(targetColor, fillColor)) return;

    const pixelStack: Point[] = [{ x: startX, y: startY }];
    const width = this.canvasWidth;
    const height = this.canvasHeight;

    while (pixelStack.length > 0) {
      const { x, y } = pixelStack.pop()!;
      let currentY = y;

      while (currentY >= 0 && this.colorsMatch(this.getPixelColor(data, x, currentY), targetColor)) {
        currentY--;
      }
      currentY++;

      let reachLeft = false;
      let reachRight = false;

      while (currentY < height && this.colorsMatch(this.getPixelColor(data, x, currentY), targetColor)) {
        this.setPixelColor(data, x, currentY, fillColor);

        if (x > 0) {
          if (this.colorsMatch(this.getPixelColor(data, x - 1, currentY), targetColor)) {
            if (!reachLeft) {
              pixelStack.push({ x: x - 1, y: currentY });
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < width - 1) {
          if (this.colorsMatch(this.getPixelColor(data, x + 1, currentY), targetColor)) {
            if (!reachRight) {
              pixelStack.push({ x: x + 1, y: currentY });
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }
        currentY++;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  getPixelColor(data: Uint8ClampedArray, x: number, y: number): [number, number, number, number] {
    const idx = (y * this.canvasWidth + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  }

  setPixelColor(data: Uint8ClampedArray, x: number, y: number, color: [number, number, number, number]) {
    const idx = (y * this.canvasWidth + x) * 4;
    data[idx] = color[0];
    data[idx + 1] = color[1];
    data[idx + 2] = color[2];
    data[idx + 3] = color[3];
  }

  colorsMatch(a: [number, number, number, number], b: [number, number, number, number]): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  hexToRgb(hex: string): [number, number, number, number] {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, Math.round(this.brush().opacity * 255)];
  }

  // --- Image Import ---
  importImage(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const layer = this.activeLayer || this.addLayer('صورة مستوردة');
        const ctx = layer.ctx;
        
        // Scale image to fit canvas proportionally if larger
        let drawW = img.width;
        let drawH = img.height;
        if (drawW > this.canvasWidth || drawH > this.canvasHeight) {
          const ratio = Math.min(this.canvasWidth / drawW, this.canvasHeight / drawH);
          drawW *= ratio;
          drawH *= ratio;
        }

        const posX = (this.canvasWidth - drawW) / 2;
        const posY = (this.canvasHeight - drawH) / 2;

        ctx.drawImage(img, posX, posY, drawW, drawH);
        this.saveState();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // --- Undo / Redo History ---
  saveState() {
    const snapshot = this.layers().map(l => ({
      layerId: l.id,
      imageData: l.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight)
    }));

    if (this.historyStep < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyStep + 1);
    }

    this.historyStack.push(snapshot);
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    } else {
      this.historyStep++;
    }
  }

  undo() {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.restoreState(this.historyStack[this.historyStep]);
    }
  }

  redo() {
    if (this.historyStep < this.historyStack.length - 1) {
      this.historyStep++;
      this.restoreState(this.historyStack[this.historyStep]);
    }
  }

  restoreState(state: { layerId: string; imageData: ImageData }[]) {
    state.forEach(item => {
      const layer = this.layers().find(l => l.id === item.layerId);
      if (layer) {
        layer.ctx.putImageData(item.imageData, 0, 0);
      }
    });
  }

  clearCanvas() {
    if (confirm('هل أنت متأكد من رغبتك في مسح اللوحة بالكامل؟')) {
      this.layers().forEach(l => {
        l.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      });
      this.saveState();
    }
  }

  // --- Project Save & Export ---
  saveProjectLocally() {
    const savedLayers: SavedLayerData[] = this.layers().map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      opacity: l.opacity,
      dataUrl: l.canvas.toDataURL('image/png')
    }));

    const mergedDataUrl = this.getMergedCanvasDataUrl('png', false);

    const project: DrawProject = {
      id: this.currentProjectId || 'proj_' + Date.now(),
      title: this.currentProjectTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      width: this.canvasWidth,
      height: this.canvasHeight,
      background: this.background(),
      thumbnail: mergedDataUrl,
      layers: savedLayers
    };

    this.drawService.saveProject(project);
    this.currentProjectId = project.id;
    this.isSaving = true;
    setTimeout(() => this.isSaving = false, 1500);
  }

  loadProject(proj: DrawProject) {
    if (confirm('سيتم فتح الرسمة المحددة واستبدال التعديلات الحالية. هل تود الاستمرار؟')) {
      // Clear existing layers
      this.layers().forEach(l => l.canvas.remove());
      this.layers.set([]);

      this.currentProjectId = proj.id;
      this.currentProjectTitle = proj.title;
      this.background.set(proj.background);

      proj.layers.forEach((layerData, idx) => {
        const layer = this.addLayer(layerData.name);
        layer.visible = layerData.visible;
        layer.locked = layerData.locked;
        this.setLayerOpacity(layer, layerData.opacity);

        const img = new Image();
        img.onload = () => {
          layer.ctx.drawImage(img, 0, 0);
          if (idx === proj.layers.length - 1) {
            this.saveState();
          }
        };
        img.src = layerData.dataUrl;
      });

      this.showGallery = false;
    }
  }

  createNewProject() {
    if (confirm('تجهيز لوحة بيضاء جديدة؟ (تأكد من حفظ الرسمة الحالية أولاً)')) {
      this.layers().forEach(l => l.canvas.remove());
      this.layers.set([]);
      this.currentProjectId = null;
      this.currentProjectTitle = 'لوحة رسم جديدة';
      this.initCanvasWorkspace();
      this.showGallery = false;
    }
  }

  getMergedCanvasDataUrl(format: 'png' | 'jpeg', transparentBackground = false): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvasWidth;
    tempCanvas.height = this.canvasHeight;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Fill background if not transparent
    if (!transparentBackground) {
      if (this.background() === 'white') {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      } else if (this.background() === 'dark') {
        tempCtx.fillStyle = '#0f172a';
        tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      } else if (this.background() === 'parchment') {
        tempCtx.fillStyle = '#fef3c7';
        tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      } else {
        tempCtx.fillStyle = '#1e293b';
        tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
    }

    // Composite layers
    this.layers().forEach(l => {
      if (l.visible) {
        tempCtx.globalAlpha = l.opacity;
        tempCtx.drawImage(l.canvas, 0, 0);
      }
    });

    return tempCanvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png');
  }

  exportImage(format: 'png' | 'jpeg' | 'json', transparent = false) {
    if (format === 'json') {
      const savedLayers: SavedLayerData[] = this.layers().map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        dataUrl: l.canvas.toDataURL('image/png')
      }));
      const proj: DrawProject = {
        id: this.currentProjectId || 'proj_' + Date.now(),
        title: this.currentProjectTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        width: this.canvasWidth,
        height: this.canvasHeight,
        background: this.background(),
        thumbnail: this.getMergedCanvasDataUrl('png'),
        layers: savedLayers
      };
      this.drawService.exportAsJson(proj);
    } else {
      const dataUrl = this.getMergedCanvasDataUrl(format, transparent);
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `${this.currentProjectTitle || 'super-drawing'}.${format}`;
      anchor.click();
    }
    this.showExportModal = false;
  }

  async copyToClipboard() {
    try {
      const dataUrl = this.getMergedCanvasDataUrl('png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('تم نسخ اللوحة إلى الحافظة بنجاح!');
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      alert('لم نتمكن من نسخ الصورة مباشرة. يمكنك تنزيلها ببدائل أخرى.');
    }
  }

  // Hotkeys
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveProjectLocally();
    } else if (event.key.toLowerCase() === 'b') {
      this.activeTool.set('brush');
    } else if (event.key.toLowerCase() === 'p') {
      this.activeTool.set('pencil');
    } else if (event.key.toLowerCase() === 'e') {
      this.activeTool.set('eraser');
    } else if (event.key.toLowerCase() === 'g') {
      this.activeTool.set('bucket');
    }
  }
}
