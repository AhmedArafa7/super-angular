export type SpecializationId = 
  | 'frontend' 
  | 'backend' 
  | 'fullstack' 
  | 'mobile' 
  | 'devops' 
  | 'ai' 
  | 'gamedev' 
  | 'security' 
  | 'database' 
  | 'iot';

export interface SpecializationTrack {
  id: SpecializationId;
  title: string;
  titleEn: string;
  badge: string;
  icon: string;
  accentColor: string; // e.g. 'from-cyan-500 to-blue-600'
  textColor: string;   // e.g. 'text-cyan-400'
  bgLight: string;     // e.g. 'bg-cyan-500/10'
  borderColor: string; // e.g. 'border-cyan-500/30'
  description: string;
  skills: string[];
  roadmapSteps: {
    level: 'أساسي (Foundations)' | 'متوسط (Intermediate)' | 'متقدم (Advanced)' | 'خبير (Mastery)';
    topics: string[];
  }[];
  quickStats: {
    label: string;
    value: string;
  }[];
}

export type DevHubTab = 'tools' | 'blueprints' | 'cheatsheets' | 'checklists' | 'resources' | 'prompts';

export interface DevToolItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string;
  description: string;
  isBuiltIn: boolean; // Has built-in interactive widget
  trackIds: SpecializationId[] | 'all';
  tags: string[];
  externalUrl?: string;
  widgetId?: string; // Links to built-in widget logic
}

export interface ArchitectureBlueprint {
  id: string;
  title: string;
  trackId: SpecializationId;
  pattern: string; // e.g. 'Clean Architecture', 'Feature-Sliced', 'Microservices'
  description: string;
  treeStructure: string;
  sampleCodeTitle?: string;
  sampleCodeLanguage?: string;
  sampleCode?: string;
  benefits: string[];
}

export interface ChecklistItem {
  id: string;
  trackId: SpecializationId | 'all';
  category: 'Security' | 'Performance' | 'Quality & Testing' | 'SEO & Accessibility' | 'Deployment & Ops' | 'Architecture';
  title: string;
  description: string;
  severity: 'critical' | 'recommended' | 'optional';
}

export interface CheatSheetCommand {
  command: string;
  description: string;
  tags: string[];
  trackIds: SpecializationId[];
  category: string;
}

export interface CuratedResource {
  id: string;
  title: string;
  trackId: SpecializationId;
  category: 'Libraries & Frameworks' | 'Free APIs' | 'Official Docs' | 'Tools & Platforms' | 'Best Practices';
  description: string;
  url: string;
  badge?: string;
  starsOrPopularity?: string;
}

export interface AIPromptTemplate {
  id: string;
  title: string;
  trackId: SpecializationId | 'all';
  category: 'Code Review' | 'Debugging' | 'Refactoring' | 'Unit Tests' | 'Architecture' | 'Documentation';
  description: string;
  prompt: string;
  variables: string[];
}
