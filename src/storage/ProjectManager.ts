import type { NetrionProjectData } from './ProjectSchema';
import {
  createDefaultProject,
  validateProjectData,
} from './ProjectSchema';

export interface ProjectSaveResult {
  filePath: string | null;
  success: boolean;
}

export interface ElectronDesktopAPI {
  isDesktop: boolean;
  openProjectFile: () => Promise<{ filePath: string; content: string } | null>;
  saveProjectFile: (payload: {
    filePath?: string | null;
    content: string;
    defaultName?: string;
  }) => Promise<{ filePath: string; success: boolean } | null>;
  getAppInfo: () => Promise<{ version: string; platform: string; isDesktop: boolean }>;
  onMenuAction: (callback: (action: string) => void) => () => void;
}

declare global {
  interface Window {
    netrionDesktop?: ElectronDesktopAPI;
  }
}

const AUTOSAVE_STORAGE_KEY = 'netrion_autosave_project';
const RECENT_PROJECTS_KEY = 'netrion_recent_projects';

export class ProjectManager {
  private currentFilePath: string | null = null;
  private currentProject: NetrionProjectData;
  private isDirty = false;

  constructor(initialProject?: NetrionProjectData) {
    this.currentProject = initialProject || this.loadAutosavedProject() || createDefaultProject();
  }

  public getProject(): NetrionProjectData {
    return this.currentProject;
  }

  public getFilePath(): string | null {
    return this.currentFilePath;
  }

  public getIsDirty(): boolean {
    return this.isDirty;
  }

  public markDirty(): void {
    this.isDirty = true;
    this.autosave();
  }

  public newProject(name = 'Untitled-Network'): NetrionProjectData {
    this.currentProject = createDefaultProject(name);
    this.currentFilePath = null;
    this.isDirty = false;
    this.autosave();
    return this.currentProject;
  }

  public updateProjectData(updated: Partial<NetrionProjectData>): NetrionProjectData {
    this.currentProject = {
      ...this.currentProject,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    this.markDirty();
    return this.currentProject;
  }

  public async openProject(): Promise<{ project: NetrionProjectData; filePath: string | null } | null> {
    if (window.netrionDesktop) {
      // Desktop Electron native dialog
      const fileResult = await window.netrionDesktop.openProjectFile();
      if (!fileResult) return null;

      const parsed = JSON.parse(fileResult.content);
      const validated = validateProjectData(parsed);
      this.currentProject = validated;
      this.currentFilePath = fileResult.filePath;
      this.isDirty = false;
      this.addToRecent(fileResult.filePath, validated.name);
      this.autosave();
      return { project: this.currentProject, filePath: this.currentFilePath };
    }

    // Web fallback via File Picker
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.netrion,.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const validated = validateProjectData(parsed);
          this.currentProject = validated;
          this.currentFilePath = null;
          this.isDirty = false;
          this.autosave();
          resolve({ project: this.currentProject, filePath: null });
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }

  public async saveProject(forceSaveAs = false): Promise<ProjectSaveResult | null> {
    const jsonString = JSON.stringify(this.currentProject, null, 2);
    const targetFile = forceSaveAs ? null : this.currentFilePath;

    if (window.netrionDesktop) {
      const saveResult = await window.netrionDesktop.saveProjectFile({
        filePath: targetFile,
        content: jsonString,
        defaultName: `${this.currentProject.name.toLowerCase().replace(/\s+/g, '-')}.netrion`,
      });

      if (!saveResult) return null;

      this.currentFilePath = saveResult.filePath;
      this.isDirty = false;
      this.addToRecent(saveResult.filePath, this.currentProject.name);
      return { filePath: saveResult.filePath, success: true };
    }

    // Web download fallback
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject.name.toLowerCase().replace(/\s+/g, '-')}.netrion`;
    a.click();
    URL.revokeObjectURL(url);

    this.isDirty = false;
    return { filePath: null, success: true };
  }

  public exportJSON(): void {
    const jsonString = JSON.stringify(this.currentProject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject.name}-topology.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public async importJSON(jsonText: string): Promise<NetrionProjectData> {
    const parsed = JSON.parse(jsonText);
    const validated = validateProjectData(parsed);
    this.currentProject = validated;
    this.currentFilePath = null;
    this.isDirty = false;
    this.autosave();
    return this.currentProject;
  }

  private autosave(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(this.currentProject));
      }
    } catch {
      // Storage might be full or restricted
    }
  }

  private loadAutosavedProject(): NetrionProjectData | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
        if (!raw) return null;
        return validateProjectData(JSON.parse(raw));
      }
      return null;
    } catch {
      return null;
    }
  }

  private addToRecent(filePath: string, projectName: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
        const list: Array<{ path: string; name: string; timestamp: number }> = stored ? JSON.parse(stored) : [];
        const filtered = list.filter((item) => item.path !== filePath);
        filtered.unshift({ path: filePath, name: projectName, timestamp: Date.now() });
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered.slice(0, 10)));
      }
    } catch {
      // Ignore storage errors
    }
  }
}
