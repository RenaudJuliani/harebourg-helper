import type { StateCreator } from 'zustand';
import type { DetectedEntity, DetectionError, DetectionResult } from '../../core/types';
import { invokeDetectEntities } from '../../services/detection';

export type DetectionStatus = 'idle' | 'detecting' | 'success' | 'error';

export type DetectionSlice = {
  detectionStatus: DetectionStatus;
  lastDetection: DetectionResult | null;
  detectionError: DetectionError | null;
  runDetection: () => Promise<void>;
  clearDetectionError: () => void;
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
