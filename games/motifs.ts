// Regionally familiar things, drawn as line motifs (spec §5, §13.1). Shared by
// Memory Flip and Sequence Recall so both games draw from the same icon set.
export interface Motif {
  id: string;
  label: string;
  tint: string;
  ink: string;
}

export const MOTIFS: Motif[] = [
  { id: 'tea-leaf', label: 'Tea Leaf', tint: '#E7F0E3', ink: '#3E7C5A' },
  { id: 'hornbill', label: 'Hornbill', tint: '#FBF1DC', ink: '#B5722F' },
  { id: 'rhino', label: 'Rhino Horn', tint: '#FBE7E2', ink: '#B5502F' },
  { id: 'monastery', label: 'Monastery', tint: '#E3EEF2', ink: '#3E6E86' },
  { id: 'bamboo', label: 'Bamboo', tint: '#E7F0E3', ink: '#4E7C3E' },
  { id: 'drum', label: 'Bihu Drum', tint: '#FBF1DC', ink: '#9A6B2E' },
  { id: 'boat', label: 'River Boat', tint: '#E3EEF2', ink: '#3E6E86' },
  { id: 'orchid', label: 'Orchid', tint: '#F5E7F1', ink: '#8C4E7C' },
];
