import { Injectable } from '@angular/core';

export interface GodotProject {
  id: string;
  name: string;
  sceneTree: string;
  scripts: GodotScript[];
  assets: GodotAsset[];
  exportSettings: {
    target: 'web' | 'desktop';
    resolution: { width: number; height: number };
  };
  createdAt: number;
  updatedAt: number;
}

export interface GodotScript {
  name: string;
  content: string;
  attachedTo: string;
}

export interface GodotAsset {
  name: string;
  type: 'sprite' | 'sound' | 'font';
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class GodotExportService {
  private readonly STORAGE_KEY = 'si_neuro_godot_projects_v1';

  constructor() {}

  createNewProject(name: string): GodotProject {
    return {
      id: 'godot_' + Math.random().toString(36).substr(2, 9),
      name: name,
      sceneTree: this.getDefaultSceneTree(),
      scripts: [this.getDefaultScript()],
      assets: [],
      exportSettings: {
        target: 'web',
        resolution: { width: 800, height: 600 }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private getDefaultSceneTree(): string {
    return `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="."]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="Player"]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="Camera2D" type="Camera2D" parent="Player"]`;
  }

  private getDefaultScript(): GodotScript {
    return {
      name: 'player.gd',
      content: `extends CharacterBody2D

const SPEED = 300.0
const JUMP_VELOCITY = -400.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _ready():
    pass

func _physics_process(delta):
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    var direction = Input.get_axis("ui_left", "ui_right")
    if direction:
        velocity.x = direction * SPEED
    else:
        velocity.x = move_toward(velocity.x, 0, SPEED)

    move_and_slide()`,
      attachedTo: 'Player'
    };
  }

  generateSceneTree(project: GodotProject): string {
    let sceneTree = project.sceneTree;
    project.scripts.forEach(script => {
      const scriptPath = `res://scripts/${script.name}`;
      if (!sceneTree.includes(scriptPath)) {
        sceneTree += `\n[ext_resource type="Script" path="${scriptPath}" id="${script.name}"]`;
      }
    });
    return sceneTree;
  }

  generateProjectFile(project: GodotProject): string {
    return `; Engine configuration file.
[application]
config/name="${project.name}"
config/features=PackedStringArray("4.2", "GL Compatibility")
[display]
window/size/viewport_width=${project.exportSettings.resolution.width}
window/size/viewport_height=${project.exportSettings.resolution.height}`;
  }

  async exportToWeb(project: GodotProject): Promise<string> {
    const gameConfig = this.parseGDScript(project.scripts);
    const w = project.exportSettings.resolution.width;
    const h = project.exportSettings.resolution.height;

    return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${project.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,sans-serif;overflow:hidden}
#gc{width:${w}px;height:${h}px;border:3px solid #333;border-radius:12px;position:relative;overflow:hidden;box-shadow:0 0 40px rgba(0,0,0,0.6)}
canvas{width:100%;height:100%}
.hud{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:12px 16px;color:#fff;font-weight:bold;font-size:15px;text-shadow:1px 1px 3px rgba(0,0,0,0.9)}
.hud>div{background:rgba(0,0,0,0.55);padding:6px 14px;border-radius:8px}
.hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:11px;background:rgba(0,0,0,0.5);padding:6px 14px;border-radius:8px}
</style>
</head>
<body>
<div id="gc">
<canvas id="cv"></canvas>
<div class="hud"><div>${project.name}</div><div>Score: <span id="sc">0</span></div></div>
<div class="hint">WASD / Arrow Keys to move | Space to jump</div>
</div>
<script>
(function(){
var cv=document.getElementById('cv'),cx=cv.getContext('2d');
cv.width=${w};cv.height=${h};
var C=${JSON.stringify(gameConfig)};
var P={x:C.ps.x,y:C.ps.y,w:C.ps.w,h:C.ps.h,vx:0,vy:0,onFloor:false,color:C.pc};
var keys={},score=0,alive=true,platforms=[],enemies=[],coins=[];

function init(){
  platforms=C.platforms.slice();
  enemies=C.enemies.slice();
  coins=C.coins.slice();
  for(var i=0;i<coins.length;i++) coins[i].got=false;
}
init();

document.addEventListener('keydown',function(e){keys[e.key.toLowerCase()]=true;keys[e.code]=true});
document.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;keys[e.code]=false});

function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function tick(){
  if(!alive) return;
  cx.fillStyle=C.sky;cx.fillRect(0,0,cv.width,cv.height);

  cx.fillStyle=C.mtn;
  cx.beginPath();cx.moveTo(0,cv.height-50);
  for(var x=0;x<=cv.width;x+=80) cx.lineTo(x,cv.height-80-Math.sin(x*0.008+Date.now()*0.0003)*40);
  cx.lineTo(cv.width,cv.height-50);cx.fill();

  cx.fillStyle='rgba(255,255,255,0.25)';
  for(var i=0;i<4;i++){var cx2=(Date.now()*0.008+i*220)%(cv.width+120)-60;
    cx.beginPath();cx.arc(cx2,40+i*25,22,0,Math.PI*2);cx.arc(cx2+18,35+i*22,18,0,Math.PI*2);cx.arc(cx2+36,40+i*25,22,0,Math.PI*2);cx.fill();}

  if(!P.onFloor) P.vy+=C.grav*0.016;
  var mx=0;
  if(keys['arrowleft']||keys['a']) mx=-C.spd;
  if(keys['arrowright']||keys['d']) mx=C.spd;
  P.vx=mx;
  if((keys[' ']||keys['arrowup']||keys['w'])&&P.onFloor){P.vy=C.jmp;P.onFloor=false;}
  P.x+=P.vx*0.016;P.y+=P.vy*0.016;

  P.onFloor=false;
  for(var i=0;i<platforms.length;i++){
    var pl=platforms[i];
    if(hit(P,pl)&&P.vy>0&&P.y+P.h>pl.y&&P.y<pl.y){P.y=pl.y-P.h;P.vy=0;P.onFloor=true;}
  }
  if(P.y+P.h>cv.height-40){P.y=cv.height-40-P.h;P.vy=0;P.onFloor=true;}
  if(P.x<0)P.x=0;if(P.x+P.w>cv.width)P.x=cv.width-P.w;

  for(var i=coins.length-1;i>=0;i--){
    if(!coins[i].got&&hit(P,coins[i])){coins[i].got=true;score+=coins[i].pts;
      document.getElementById('sc').textContent=score;}
  }

  for(var i=0;i<enemies.length;i++){
    if(hit(P,enemies[i])){alive=false;
      cx.fillStyle='rgba(0,0,0,0.7)';cx.fillRect(0,0,cv.width,cv.height);
      cx.fillStyle='#e94560';cx.font='bold 48px system-ui';cx.textAlign='center';
      cx.fillText('GAME OVER',cv.width/2,cv.height/2-20);
      cx.fillStyle='#fff';cx.font='20px system-ui';
      cx.fillText('Score: '+score,cv.width/2,cv.height/2+20);
      cx.fillText('Refresh to play again',cv.width/2,cv.height/2+55);return;}
  }

  cx.fillStyle=C.plc;
  for(var i=0;i<platforms.length;i++){var p=platforms[i];cx.fillRect(p.x,p.y,p.w,p.h);}
  cx.fillStyle=C.gnd;cx.fillRect(0,cv.height-40,cv.width,40);

  for(var i=0;i<coins.length;i++){
    if(!coins[i].got){cx.fillStyle=coins[i].cl;
      cx.beginPath();cx.arc(coins[i].x+10,coins[i].y+10,10,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff8';cx.beginPath();cx.arc(coins[i].x+7,coins[i].y+7,3,0,Math.PI*2);cx.fill();}
  }

  cx.fillStyle=C.ec;
  for(var i=0;i<enemies.length;i++){var e=enemies[i];
    cx.fillRect(e.x,e.y,e.w,e.h);
    cx.fillStyle='#fff';cx.fillRect(e.x+5,e.y+4,7,7);cx.fillRect(e.x+e.w-12,e.y+4,7,7);
    cx.fillStyle='#000';cx.fillRect(e.x+7,e.y+6,3,3);cx.fillRect(e.x+e.w-10,e.y+6,3,3);
    cx.fillStyle=C.ec;}

  cx.fillStyle=P.color;cx.fillRect(P.x,P.y,P.w,P.h);
  cx.fillStyle='#fff';cx.fillRect(P.x+5,P.y+6,9,9);cx.fillRect(P.x+P.w-14,P.y+6,9,9);
  cx.fillStyle='#222';cx.fillRect(P.x+8,P.y+9,5,5);cx.fillRect(P.x+P.w-11,P.y+9,5,5);

  requestAnimationFrame(tick);
}
tick();
})();
</script>
</body>
</html>`;
  }

  private parseGDScript(scripts: GodotScript[]): any {
    const main = scripts.find(s => /player|game|main/i.test(s.name)) || scripts[0];
    const c = main?.content || '';

    const speedM = c.match(/(?:SPEED|speed)\s*=\s*(\d+)/i);
    const spd = speedM ? parseInt(speedM[1]) : 300;

    const jmpM = c.match(/(?:JUMP_VELOCITY|jump_force)\s*=\s*(-?\d+)/i);
    const jmp = jmpM ? parseInt(jmpM[1]) : -400;

    const gravM = c.match(/(?:gravity|GRAVITY)\s*=\s*(\d+)/i);
    const grav = gravM ? parseInt(gravM[1]) : 900;

    const lc = c.toLowerCase();
    const isSpace = /space|ship|galaxy|star|ufo|shmup/.test(lc);
    const isNight = /night|dark|horror|zombie|ghost/.test(lc);
    const isAdventure = /adventure|ooo|fantasy|quest|forest|dragon/.test(lc);
    const hasEnemies = /enemy|enemies|monster|boss|zombie/.test(lc);
    const hasCoins = /coin|gem|collect|star|pickup/.test(lc);

    let sky, gnd, mtn, pc, ec, plc;

    if (isSpace) {
      sky='#050520';gnd='#1a1a3e';mtn='#0a0a25';pc='#00ff88';ec='#ff2244';plc='#2a2a55';
    } else if (isNight) {
      sky='#0a0a18';gnd='#151525';mtn='#080815';pc='#ffcc00';ec='#ff4444';plc='#333355';
    } else if (isAdventure) {
      sky='#4ab8f0';gnd='#2d8a2d';mtn='#1a5c1a';pc='#e94560';ec='#8b4513';plc='#654321';
    } else {
      sky='#5b9bd5';gnd='#3a8a3a';mtn='#256a25';pc='#e94560';ec='#b83030';plc='#5a3a1a';
    }

    const platforms = [];
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      platforms.push({
        x: 80 + i * (700 / count) + Math.random() * 40,
        y: 380 + Math.sin(i * 1.2) * 80,
        w: 80 + Math.floor(Math.random() * 60),
        h: 18
      });
    }

    const enemies = [];
    if (hasEnemies) {
      const ec2 = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < ec2; i++) {
        enemies.push({ x: 150 + i * 180, y: 500 - 40, w: 30, h: 30 });
      }
    }

    const coins = [];
    const coinCount = hasCoins ? 6 + Math.floor(Math.random() * 8) : 4;
    const coinColors = ['#ffd700', '#ff6b9d', '#4ecdc4', '#45b7d1', '#96e6a1', '#dda0dd'];
    for (let i = 0; i < coinCount; i++) {
      coins.push({
        x: 60 + i * 90 + Math.random() * 30,
        y: 250 + Math.random() * 200,
        w: 20, h: 20, pts: 10, cl: coinColors[i % coinColors.length]
      });
    }

    return {
      spd, jmp: jmp < 0 ? jmp : -Math.abs(jmp), grav,
      ps: { x: 100, y: 450, w: 36, h: 44 },
      pc, ec, plc, sky, gnd, mtn,
      platforms, enemies, coins
    };
  }

  saveProject(project: GodotProject): void {
    if (typeof localStorage !== 'undefined') {
      const projects = this.getAllProjects();
      const idx = projects.findIndex(p => p.id === project.id);
      project.updatedAt = Date.now();
      if (idx >= 0) projects[idx] = project;
      else projects.push(project);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    }
  }

  loadProject(projectId: string): GodotProject | null {
    return this.getAllProjects().find(p => p.id === projectId) || null;
  }

  getAllProjects(): GodotProject[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) { console.error('Error loading Godot projects:', e); }
    }
    return [];
  }

  deleteProject(projectId: string): void {
    if (typeof localStorage !== 'undefined') {
      const projects = this.getAllProjects().filter(p => p.id !== projectId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    }
  }
}
