import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import './Dialog.css';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="netrion-dialog-overlay" onClick={onClose}>
      <div className="netrion-dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <ShieldCheck size={16} />
            <span>ABOUT NETRION</span>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="dialog-content about-content">
          <div className="about-branding">
            <h2 className="about-title">NETRION</h2>
            <span className="about-version">v0.1.0-alpha • Desktop Edition</span>
          </div>

          <p className="about-description">
            Open-source Computer Network Simulation & Cybersecurity Learning Workstation.
            Designed for engineers, students, and penetration testers seeking deep packet-level clarity.
          </p>

          <div className="about-meta">
            <div className="meta-row">
              <span className="meta-label">Architecture:</span>
              <span className="meta-val">Decoupled Discrete Event Simulator (DES)</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Design Archetype:</span>
              <span className="meta-val">Technical Console & Industrial Utility (Anti-Slop)</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Project Format:</span>
              <span className="meta-val">.netrion (Schema v1.0.0)</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">License:</span>
              <span className="meta-val">MIT Open Source</span>
            </div>
          </div>
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
