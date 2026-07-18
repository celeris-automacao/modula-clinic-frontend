export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
// AlertItem is a backward-compat alias for the generated Alert schema.
export type { AlertItem } from "./alerts";
// Treatment history hooks live in extensions (not generated) until the spec includes the endpoint.
export {
  useGetPatientTreatments,
  getGetPatientTreatmentsQueryKey,
  getGetPatientTreatmentsUrl,
} from "./extensions";
export * from './generated/api';
export * from './generated/api.schemas';
