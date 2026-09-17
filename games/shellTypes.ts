import { AvatarId } from '../state/AppContext';

/** Props for games that render inside the full "Northeast" GameShell. */
export interface ShellGameProps {
  level: number; // 1-3, adaptive difficulty
  stage: number; // 1..totalStages, this session
  totalStages: number;
  avatarId: AvatarId | null;
  onComplete: (result: { accuracy: number; leveledUp: boolean }) => void;
  onBack: () => void;
}
