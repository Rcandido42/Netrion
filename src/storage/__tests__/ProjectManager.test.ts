import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectManager } from '../ProjectManager';
import { createDefaultProject, validateProjectData } from '../ProjectSchema';

describe('ProjectSchema & ProjectManager', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('creates a valid default project structure', () => {
    const proj = createDefaultProject('Lab-Cyber-01');
    expect(proj.formatVersion).toBe('1.0.0');
    expect(proj.name).toBe('Lab-Cyber-01');
    expect(proj.devices).toEqual([]);
    expect(proj.connections).toEqual([]);
    expect(proj.simulationSettings.speed).toBe(1);
    expect(proj.simulationSettings.isPaused).toBe(false);
  });

  it('validates correct project JSON', () => {
    const defaultProj = createDefaultProject('Test');
    const validated = validateProjectData(defaultProj);
    expect(validated.name).toBe('Test');
    expect(validated.formatVersion).toBe('1.0.0');
  });

  it('throws error when project format version is unsupported', () => {
    expect(() => {
      validateProjectData({ formatVersion: '9.9.9', devices: [], connections: [] });
    }).toThrow('Unsupported project format version');
  });

  it('manages dirty state and project metadata correctly', () => {
    const manager = new ProjectManager();
    expect(manager.getIsDirty()).toBe(false);

    manager.markDirty();
    expect(manager.getIsDirty()).toBe(true);

    manager.newProject('Fresh-Net');
    expect(manager.getProject().name).toBe('Fresh-Net');
    expect(manager.getIsDirty()).toBe(false);
  });
});
