import type { TreatmentStatusResult } from "./generated/api.schemas";

// Re-export so existing imports of TreatmentStatusResult still work
export type { TreatmentStatusResult };

/** @deprecated Use TreatmentStatusResult from the generated schemas */
export type TreatmentPublishResult = TreatmentStatusResult;
