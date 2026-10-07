import React from 'react';
import { X, Keyboard } from 'lucide-react';
import './Dialog.css';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + N', desc: 'New Network Project' },
    { key: 'Ctrl + O', desc: 'Open Project (.netrion)' },
    { key: 'Ctrl + S', desc: 'Save Project' },
    { key: 'Ctrl + Shift + S', desc: 'Save Project As...' },
    { key: 'Space', desc: 'Play / Pause Simulation' },
    { key: 'F8', desc: 'Step Simulation (Single Tick)' },
    { key: 'Ctrl + R', desc: 'Reset Simulation Clock & Queues' },
    { key: 'Delete / Backspace', desc: 'Delete Selected Node or Link' },
    { key: 'Ctrl + `', desc: 'Toggle Bottom Console' },
    { key: 'Ctrl + + / -', desc: 'Zoom In / Out' },
    { key: 'Ctrl + 0', desc: 'Reset Viewport Zoom (100%)' },
    { key: 'Esc', desc: 'Cancel Tool / Deselect' },
  ];

  return (
    <div className="netrion-dialog-overlay" onClick={onClose}>
      <div className="netrion-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <Keyboard size={16} />
            <span>KEYBOARD SHORTCUTS REFERENCE</span>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="dialog-content">
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>Shortcut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.key}>
                  <td>
                    <kbd className="mono-numbers">{s.key}</kbd>
                  </td>
                  <td>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
