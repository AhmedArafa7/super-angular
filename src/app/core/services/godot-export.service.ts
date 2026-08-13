import { Injectable, inject } from '@angular/core';
import { GodotWasmRunnerService } from './godot-wasm-runner.service';

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
  private wasmRunner = inject(GodotWasmRunnerService);

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
    return await this.wasmRunner.buildRealGodotWebPackage(project);
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
