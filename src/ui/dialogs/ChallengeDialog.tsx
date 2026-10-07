import React, { useState } from 'react';
import { Target, X, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import type { ChallengeScenario } from '../../challenges/types';
import { challengesList } from '../../challenges/scenarios';
import './ChallengeDialog.css';

interface ChallengeDialogProps {
  isOpen: boolean;
  activeChallengeId: string | null;
  isCompleted: boolean;
  onClose: () => void;
  onSelectChallenge: (scenario: ChallengeScenario) => void;
}

export const ChallengeDialog: React.FC<ChallengeDialogProps> = ({
  isOpen,
  activeChallengeId,
  isCompleted,
  onClose,
  onSelectChallenge,
}) => {
  const [selectedId, setSelectedId] = useState<string>(activeChallengeId || challengesList[0].id);
  const [showHint, setShowHint] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentScenario = challengesList.find((c) => c.id === selectedId) || challengesList[0];
  const isCurrentActive = activeChallengeId === currentScenario.id;

  return (
    <div className="netrion-dialog-overlay" onClick={onClose}>
      <div className="netrion-dialog challenge-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <Target size={16} />
            <span>CYBERSECURITY & NETWORKING CHALLENGE LAB</span>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="challenge-dialog-body">
          {/* Sidebar */}
          <div className="challenge-sidebar">
            <div className="sidebar-header">LAB MODULES</div>
            <div className="challenge-nav-list">
              {challengesList.map((ch) => {
                const isActive = ch.id === selectedId;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`challenge-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedId(ch.id);
                      setShowHint(false);
                    }}
                  >
                    <div className="ch-item-header">
                      <span className="ch-item-cat">{ch.category}</span>
                      <span className={`ch-item-diff ${ch.difficulty.toLowerCase()}`}>
                        {ch.difficulty}
                      </span>
                    </div>
                    <div className="ch-item-title">{ch.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Pane */}
          <div className="challenge-details">
            <div className="details-header">
              <span className="details-cat">{currentScenario.category}</span>
              <h3 className="details-title">{currentScenario.title}</h3>
            </div>

            {/* If completed */}
            {isCurrentActive && isCompleted && (
              <div className="completion-card">
                <div className="completion-banner">
                  <CheckCircle2 size={16} />
                  <span>CHALLENGE COMPLETE</span>
                </div>
                <p className="completion-text">{currentScenario.explanationWhenCompleted}</p>
              </div>
            )}

            <div className="details-section">
              <div className="section-label">SCENARIO BRIEFING</div>
              <p className="briefing-text">{currentScenario.briefing}</p>
            </div>

            <div className="details-section">
              <div className="section-label">OBJECTIVES</div>
              <ul className="objectives-list">
                {currentScenario.objectives.map((obj, i) => (
                  <li key={i}>
                    <ChevronRight size={12} className="obj-bullet" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="details-section hint-section">
              <button
                type="button"
                className="hint-toggle-btn"
                onClick={() => setShowHint((h) => !h)}
              >
                <HelpCircle size={13} />
                <span>{showHint ? 'Hide Diagnostic Hint' : 'Show Diagnostic Hint'}</span>
              </button>
              {showHint && <div className="hint-content">{currentScenario.hint}</div>}
            </div>

            <div className="challenge-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onSelectChallenge(currentScenario);
                  onClose();
                }}
              >
                {isCurrentActive ? 'Restart Scenario in Workspace' : 'Load Scenario into Workspace'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
