import type { StateCreator } from 'zustand';
import type { Cell, DetectedEntity, DetectionError, DetectionResult } from '../../core/types';
import { invokeDetectEntities } from '../../services/detection';
import type { Toast } from './toastSlice';

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
  pushToast: (t: Omit<Toast, 'id'>) => void;
};

function errorMessage(e: DetectionError): string {
  switch (e.kind) {
    case 'WindowNotFound':
      return 'Dofus introuvable. Lance le jeu et réessaie.';
    case 'WindowMinimized':
      return "Dofus est minimisé. Ramène la fenêtre à l'avant-plan.";
    case 'PermissionDenied':
      return "Permission refusée. Active l'enregistrement d'écran dans Préférences Système.";
    case 'NotInCombat':
      return "Map non reconnue. Assure-toi d'être en combat Harebourg.";
    case 'UnexpectedShape':
      return 'Zone jouable non reconnue. Réessaie ou redémarre Dofus.';
    case 'CaptureFailed':
      return `Échec de la capture: ${e.detail ?? 'erreur inconnue'}`;
    default:
      return 'Erreur inconnue.';
  }
}

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
      if (result.entities.length === 0) {
        get().pushToast({ message: 'Aucune entité détectée.', severity: 'info' });
      } else if (result.entities.length < 3) {
        get().pushToast({
          message: `Seulement ${result.entities.length} entité(s) détectée(s) — vérifie.`,
          severity: 'info',
        });
      }
    } catch (err) {
      const e = err as DetectionError;
      set({ detectionStatus: 'error', detectionError: e });
      get().pushToast({ message: errorMessage(e), severity: 'error' });
    }
  },
});
