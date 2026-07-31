import { Injectable, signal } from '@angular/core';
import { DrawProject, SavedLayerData, CanvasBackground } from './draw.model';

@Injectable({
  providedIn: 'root'
})
export class DrawService {
  private readonly STORAGE_KEY = 'super_draw_projects_v1';
  
  projects = signal<DrawProject[]>([]);

  constructor() {
    this.loadProjectsFromStorage();
  }

  loadProjectsFromStorage(): DrawProject[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as DrawProject[];
        this.projects.set(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load projects from LocalStorage', e);
    }
    return [];
  }

  saveProject(project: DrawProject): void {
    const current = this.projects();
    const existingIndex = current.findIndex(p => p.id === project.id);
    let updated: DrawProject[];

    project.updatedAt = Date.now();

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = project;
    } else {
      updated = [project, ...current];
    }

    this.projects.set(updated);
    this.persistToStorage(updated);
  }

  deleteProject(id: string): void {
    const updated = this.projects().filter(p => p.id !== id);
    this.projects.set(updated);
    this.persistToStorage(updated);
  }

  getProjectById(id: string): DrawProject | undefined {
    return this.projects().find(p => p.id === id);
  }

  private persistToStorage(list: DrawProject[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to persist projects to LocalStorage', e);
    }
  }

  exportAsJson(project: DrawProject): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.title || 'super-draw-project'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
