import { invoke } from '@tauri-apps/api/core';
import type {
  DetectedEntity,
  DetectionError,
  DetectionErrorKind,
  DetectionResult,
} from '../core/types';

type RustDetectedEntity = {
  cell: [number, number];
  team: 'ally' | 'enemy';
  kind: 'generic' | 'harebourg';
  confidence: number;
};

type RustDetectionResult = {
  entities: RustDetectedEntity[];
  warnings: string[];
};

type RustError = { kind: string; detail?: unknown };

// Rust PipelineError is `{ kind: 'Capture' | 'Calibration', detail: { kind, detail? } }`.
// We flatten to the inner variant so the UI treats all error kinds uniformly.
function flattenError(e: unknown): DetectionError {
  const outer = e as RustError;
  if (outer && typeof outer === 'object' && 'kind' in outer) {
    const inner = outer.detail as RustError | undefined;
    if (inner && typeof inner === 'object' && 'kind' in inner) {
      return {
        kind: (inner.kind as DetectionErrorKind) ?? 'Unknown',
        detail: typeof inner.detail === 'string' ? inner.detail : undefined,
      };
    }
    return { kind: (outer.kind as DetectionErrorKind) ?? 'Unknown' };
  }
  return { kind: 'Unknown' };
}

function adaptEntity(r: RustDetectedEntity): DetectedEntity {
  return {
    cell: { x: r.cell[0], y: r.cell[1] },
    team: r.team,
    kind: r.kind,
    confidence: r.confidence,
  };
}

export async function invokeDetectEntities(): Promise<DetectionResult> {
  try {
    const raw = await invoke<RustDetectionResult>('detect_entities');
    return {
      entities: raw.entities.map(adaptEntity),
      warnings: raw.warnings,
    };
  } catch (e) {
    throw flattenError(e);
  }
}
