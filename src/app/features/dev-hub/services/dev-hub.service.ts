import { Injectable, signal, computed } from '@angular/core';
import { 
  SpecializationId, 
  SpecializationTrack, 
  DevHubTab, 
  DevToolItem, 
  ArchitectureBlueprint, 
  ChecklistItem, 
  CheatSheetCommand, 
  CuratedResource, 
  AIPromptTemplate 
} from '../models/dev-hub.models';
import { 
  SPECIALIZATION_TRACKS, 
  DEV_TOOLS, 
  ARCHITECTURE_BLUEPRINTS, 
  CHECKLIST_ITEMS, 
  CHEATSHEET_COMMANDS, 
  CURATED_RESOURCES, 
  AI_PROMPT_TEMPLATES 
} from '../data/tracks-data';

@Injectable({
  providedIn: 'root'
})
export class DevHubService {
  private readonly TRACK_STORAGE_KEY = 'super_dev_active_track';
  private readonly CHECKLIST_STORAGE_KEY = 'super_dev_completed_checklists';
  private readonly FAVORITES_STORAGE_KEY = 'super_dev_favorites';

  // State Signals
  readonly tracks = signal<SpecializationTrack[]>(SPECIALIZATION_TRACKS);
  readonly activeTrackId = signal<SpecializationId>(this.loadInitialTrack());
  readonly activeTab = signal<DevHubTab>('tools');
  readonly searchQuery = signal<string>('');
  readonly activeToolWidget = signal<string | null>(null);

  // Checklists completed ids (Set of IDs)
  readonly completedChecklistIds = signal<string[]>(this.loadCompletedChecklists());

  // Favorites (Array of item keys)
  readonly favorites = signal<string[]>(this.loadFavorites());

  // Active track computed
  readonly currentTrack = computed(() => {
    const id = this.activeTrackId();
    return this.tracks().find(t => t.id === id) || this.tracks()[0];
  });

  // Filtered Tools for current track and search query
  readonly filteredTools = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return DEV_TOOLS.filter(tool => {
      const matchesTrack = tool.trackIds === 'all' || tool.trackIds.includes(track);
      if (!matchesTrack) return false;

      if (!query) return true;
      return (
        tool.name.toLowerCase().includes(query) ||
        tool.nameEn.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  });

  // Filtered Blueprints
  readonly filteredBlueprints = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return ARCHITECTURE_BLUEPRINTS.filter(bp => {
      const matchesTrack = bp.trackId === track;
      if (!matchesTrack && query.length === 0) return false;

      if (!query) return true;
      return (
        bp.title.toLowerCase().includes(query) ||
        bp.pattern.toLowerCase().includes(query) ||
        bp.description.toLowerCase().includes(query)
      );
    });
  });

  // Filtered Checklists
  readonly filteredChecklists = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return CHECKLIST_ITEMS.filter(item => {
      const matchesTrack = item.trackId === 'all' || item.trackId === track;
      if (!matchesTrack) return false;

      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  });

  // Checklist Progress %
  readonly checklistProgress = computed(() => {
    const list = this.filteredChecklists();
    if (list.length === 0) return 0;
    const completed = this.completedChecklistIds();
    const doneCount = list.filter(item => completed.includes(item.id)).length;
    return Math.round((doneCount / list.length) * 100);
  });

  // Filtered Commands
  readonly filteredCommands = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return CHEATSHEET_COMMANDS.filter(cmd => {
      const matchesTrack = cmd.trackIds.includes(track);
      if (!matchesTrack && query.length === 0) return false;

      if (!query) return true;
      return (
        cmd.command.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        cmd.tags.some(t => t.toLowerCase().includes(query))
      );
    });
  });

  // Filtered Resources
  readonly filteredResources = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return CURATED_RESOURCES.filter(res => {
      const matchesTrack = res.trackId === track;
      if (!matchesTrack && query.length === 0) return false;

      if (!query) return true;
      return (
        res.title.toLowerCase().includes(query) ||
        res.description.toLowerCase().includes(query) ||
        res.category.toLowerCase().includes(query)
      );
    });
  });

  // Filtered AI Prompts
  readonly filteredPrompts = computed(() => {
    const track = this.activeTrackId();
    const query = this.searchQuery().trim().toLowerCase();

    return AI_PROMPT_TEMPLATES.filter(p => {
      const matchesTrack = p.trackId === 'all' || p.trackId === track;
      if (!matchesTrack && query.length === 0) return false;

      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  });

  setTrack(trackId: SpecializationId): void {
    this.activeTrackId.set(trackId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.TRACK_STORAGE_KEY, trackId);
    }
  }

  setTab(tab: DevHubTab): void {
    this.activeTab.set(tab);
  }

  openToolWidget(widgetId: string): void {
    this.activeToolWidget.set(widgetId);
    this.activeTab.set('tools');
  }

  closeToolWidget(): void {
    this.activeToolWidget.set(null);
  }

  toggleChecklist(id: string): void {
    const current = this.completedChecklistIds();
    const updated = current.includes(id) 
      ? current.filter(x => x !== id)
      : [...current, id];
    
    this.completedChecklistIds.set(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CHECKLIST_STORAGE_KEY, JSON.stringify(updated));
    }
  }

  isChecklistCompleted(id: string): boolean {
    return this.completedChecklistIds().includes(id);
  }

  toggleFavorite(id: string): void {
    const current = this.favorites();
    const updated = current.includes(id) 
      ? current.filter(x => x !== id) 
      : [...current, id];
    
    this.favorites.set(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    }
  }

  isFavorite(id: string): boolean {
    return this.favorites().includes(id);
  }

  private loadInitialTrack(): SpecializationId {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.TRACK_STORAGE_KEY) as SpecializationId;
      if (saved && SPECIALIZATION_TRACKS.some(t => t.id === saved)) {
        return saved;
      }
    }
    return 'frontend';
  }

  private loadCompletedChecklists(): string[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.CHECKLIST_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  }

  private loadFavorites(): string[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.FAVORITES_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  }
}
