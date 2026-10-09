import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import './MenuBar.css';

export interface MenuBarProps {
  projectName: string;
  isDirty: boolean;
  onAction: (action: string) => void;
}

interface MenuItemDef {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

export const MenuBar: React.FC<MenuBarProps> = ({ projectName, isDirty, onAction }) => {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { id: 'new-project', label: 'New Project', shortcut: 'Ctrl+N' },
        { id: 'open-project', label: 'Open Project...', shortcut: 'Ctrl+O' },
        { id: 'sep-1', label: '', separator: true },
        { id: 'save-project', label: 'Save Project', shortcut: 'Ctrl+S' },
        { id: 'save-project-as', label: 'Save Project As...', shortcut: 'Ctrl+Shift+S' },
        { id: 'sep-2', label: '', separator: true },
        { id: 'export-project', label: 'Export Topology (JSON)...' },
        { id: 'import-project', label: 'Import Topology (JSON)...' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
        { id: 'sep-edit-1', label: '', separator: true },
        { id: 'delete-selected', label: 'Delete Selected', shortcut: 'Del' },
        { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A' },
      ],
    },
    {
      label: 'Simulation',
      items: [
        { id: 'toggle-simulation', label: 'Play / Pause', shortcut: 'Space' },
        { id: 'step-simulation', label: 'Single Step Tick', shortcut: 'F8' },
        { id: 'reset-simulation', label: 'Reset State & Buffers', shortcut: 'Ctrl+R' },
        { id: 'sep-sim-1', label: '', separator: true },
        { id: 'speed:0.5', label: 'Speed: 0.5x (Slow)' },
        { id: 'speed:1', label: 'Speed: 1.0x (Normal)' },
        { id: 'speed:2', label: 'Speed: 2.0x (Fast)' },
      ],
    },
    {
      label: 'Challenges',
      items: [
        { id: 'challenge:list', label: 'Open Challenge Lab...' },
        { id: 'challenge:reset', label: 'Reset Current Challenge' },
      ],
    },
    {
      label: 'View',
      items: [
        { id: 'app-reload', label: 'Recarregar Aplicação', shortcut: 'F5' },
        { id: 'sep-view-0', label: '', separator: true },
        { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++' },
        { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-' },
        { id: 'zoom-reset', label: 'Reset Zoom (100%)', shortcut: 'Ctrl+0' },
        { id: 'sep-view-1', label: '', separator: true },
        { id: 'toggle-console', label: 'Toggle Bottom Console', shortcut: 'Ctrl+`' },
      ],
    },
    {
      label: 'Help',
      items: [
        { id: 'help-shortcuts', label: 'Keyboard Shortcuts Guide' },
        { id: 'help-docs', label: 'Documentation & Architecture' },
        { id: 'sep-help-1', label: '', separator: true },
        { id: 'help-about', label: 'About Netrion Simulator' },
      ],
    },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (index: number) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleMouseEnter = (index: number) => {
    if (openMenuIndex !== null) {
      setOpenMenuIndex(index);
    }
  };

  const handleItemClick = (id: string) => {
    setOpenMenuIndex(null);
    onAction(id);
  };

  return (
    <div className="netrion-menubar" ref={containerRef}>
      <div className="menubar-brand">
        <img src="./netrion-logo.svg" alt="Netrion Logo" className="brand-logo" width="16" height="16" />
        <span className="brand-badge">NETRION</span>
        <span className="project-title">
          {projectName}
          {isDirty && <span className="dirty-indicator">*</span>}
        </span>
      </div>

      <nav className="menubar-nav" aria-label="Application Menu">
        {menus.map((menu, index) => {
          const isOpen = openMenuIndex === index;
          return (
            <div key={menu.label} className={`menubar-item-wrapper ${isOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="menubar-btn"
                onClick={() => handleMenuClick(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                aria-expanded={isOpen}
              >
                {menu.label}
              </button>

              {isOpen && (
                <div className="menubar-dropdown" role="menu">
                  {menu.items.map((item) => {
                    if (item.separator) {
                      return <div key={item.id} className="dropdown-separator" />;
                    }
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="dropdown-item"
                        onClick={() => handleItemClick(item.id)}
                        role="menuitem"
                      >
                        <span className="item-label">{item.label}</span>
                        {item.shortcut && <span className="item-shortcut">{item.shortcut}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="menubar-extra">
        <button
          type="button"
          className="menubar-reload-btn"
          onClick={() => onAction('app-reload')}
          title="Recarregar Aplicação (F5) - Atualiza alterações no código instantaneamente"
        >
          <RefreshCw size={11} />
          <span>Atualizar</span>
        </button>
        <span className="desktop-indicator">
          {typeof window !== 'undefined' && window.netrionDesktop ? 'DESKTOP SHELL' : 'SIMULATOR WORKSPACE'}
        </span>
      </div>
    </div>
  );
};
