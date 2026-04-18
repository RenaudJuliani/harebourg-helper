import type { StateCreator } from 'zustand';
import type { Cell, DetectedEntity, DetectionError, DetectionResult } from '../../core/types';
import { invokeDetectEntities } from '../../services/detection';

export type DetectionStatus = 'idle' | 'detecting' | 'success' | 'error';

export type DetectionSlice = {
  detectionStatus: DetectionStatus;
  lastDetection: DetectionResult | null;
  detectionError: DetectionError | null;
  runDetection: () => Promise<void>;
  clearDetectionError: () => void;
  confirmEntityDetection: (cell: Cell) => void;
};

type Requires = {
  entitiesReplaced: (detected: DetectedEntity[]) => void;
};

export const createDetectionSlice: StateCreator<
  DetectionSlice & Requires,
  [],
  [],
  DetectionSlice
> = (set, get) => ({
  detectionStatus: 'idle',
  lastDetection: null,
  detectionError: null,
  clearDetectionError: () => set({ detectionError: null, detectionStatus: 'idle' }),
  confirmEntityDetection: (cell) =>
    set((s) => ({
      lastDetection: s.lastDetection
        ? {
            ...s.lastDetection,
            entities: s.lastDetection.entities.filter(
              (e) => !(e.cell.x === cell.x && e.cell.y === cell.y),
            ),
          }
        : null,
    })),
  runDetection: async () => {
    set({ detectionStatus: 'detecting', detectionError: null });
    try {
      const result = await invokeDetectEntities();
      get().entitiesReplaced(result.entities);
      set({ detectionStatus: 'success', lastDetection: result });
    } catch (err) {
      set({
        detectionStatus: 'error',
        detectionError: err as DetectionError,
      });
    }
  },
});
