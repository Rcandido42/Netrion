import type { NetrionProjectData } from '../storage/ProjectSchema';
import type { NetworkSimulationEngine } from '../core/engine/NetworkSimulationEngine';

export interface ChallengeScenario {
  id: string;
  title: string;
  category: 'Layer 1 Physical' | 'Layer 2 Switching' | 'Layer 3 IP & Subnet' | 'Default Gateway';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  briefing: string;
  hint: string;
  objectives: string[];
  explanationWhenCompleted: string;
  initialTopology: () => NetrionProjectData;
  checkSuccess: (engine: NetworkSimulationEngine, project: NetrionProjectData) => boolean;
}
