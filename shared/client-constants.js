// ============================================================================
// CLIENT-ONLY CONSTANTS — значения, которые использует только клиент
// (интерполяция, реконсиляция, рендер).
// ============================================================================

export const INTERP_DELAY = 80;
export const RECONCILE_THRESHOLD = 0.25;
export const RECONCILE_FACTOR = 0.6;
export const SNAPSHOT_HISTORY = 30;

export const lerp = (a, b, t) => a + (b - a) * t;
