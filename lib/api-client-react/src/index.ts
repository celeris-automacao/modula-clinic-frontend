export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
// AlertItem is a backward-compat alias for the generated Alert schema.
export type { AlertItem } from "./alerts";
export {
  useListAlerts,
  getListAlertsQueryKey,
  getListAlertsUrl,
  useMarkAlertRead,
  getMarkAlertReadUrl,
  useCheckAlerts,
  getCheckAlertsUrl,
  useGetPatientTreatments,
  getGetPatientTreatmentsQueryKey,
  getGetPatientTreatmentsUrl,
} from "./extensions";
export * from './generated/api';
export * from './generated/api.schemas';
