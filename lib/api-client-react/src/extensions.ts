import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  MutationFunction,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from '@tanstack/react-query';
import type { Alert, AlertCheckResult, TreatmentHistoryItem, TreatmentStatusResult } from './generated/api.schemas';
import { customFetch } from './custom-fetch';

// Re-export so existing imports of TreatmentStatusResult still work
export type { TreatmentStatusResult };

/** @deprecated Use TreatmentStatusResult from the generated schemas */
export type TreatmentPublishResult = TreatmentStatusResult;

// ---------------------------------------------------------------------------
// GET /alerts — list all alerts for the clinic dashboard
// ---------------------------------------------------------------------------

export const getListAlertsUrl = () => `/api/alerts`;

export const getListAlertsQueryKey = () => [`/api/alerts`] as const;

const listAlerts = (options?: RequestInit): Promise<Alert[]> =>
  customFetch<Alert[]>(getListAlertsUrl(), { ...options, method: 'GET' });

export function useListAlerts<TData = Alert[], TError = unknown>(
  options?: {
    query?: UseQueryOptions<Alert[], TError, TData>;
    request?: RequestInit;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListAlertsQueryKey();
  const queryFn = ({ signal }: { signal?: AbortSignal }) =>
    listAlerts({ signal, ...requestOptions });
  const query = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return Object.assign(query, { queryKey });
}

// ---------------------------------------------------------------------------
// PATCH /alerts/:id/read — mark an alert as read
// ---------------------------------------------------------------------------

export const getMarkAlertReadUrl = (id: number) => `/api/alerts/${id}/read`;

const markAlertReadFn = (id: number, options?: RequestInit): Promise<Alert> =>
  customFetch<Alert>(getMarkAlertReadUrl(id), { ...options, method: 'PATCH' });

export function useMarkAlertRead<TData = Alert, TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<TData, TError, { id: number }, TContext>;
    request?: RequestInit;
  },
): UseMutationResult<TData, TError, { id: number }, TContext> {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationFn: MutationFunction<TData, { id: number }> = ({ id }) =>
    markAlertReadFn(id, requestOptions) as Promise<TData>;
  return useMutation({ mutationFn, ...mutationOptions });
}

// ---------------------------------------------------------------------------
// POST /alerts/check — trigger alert check across all patients
// ---------------------------------------------------------------------------

export const getCheckAlertsUrl = () => `/api/alerts/check`;

const checkAlertsFn = (options?: RequestInit): Promise<AlertCheckResult> =>
  customFetch<AlertCheckResult>(getCheckAlertsUrl(), { ...options, method: 'POST' });

export function useCheckAlerts<TData = AlertCheckResult, TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<TData, TError, void, TContext>;
    request?: RequestInit;
  },
): UseMutationResult<TData, TError, void, TContext> {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationFn: MutationFunction<TData, void> = () =>
    checkAlertsFn(requestOptions) as Promise<TData>;
  return useMutation({ mutationFn, ...mutationOptions });
}

// ---------------------------------------------------------------------------
// GET /patients/:id/treatments — full treatment history (active + closed)
// ---------------------------------------------------------------------------

export const getGetPatientTreatmentsUrl = (id: number) =>
  `/api/patients/${id}/treatments`;

export const getGetPatientTreatmentsQueryKey = (id: number) =>
  [`/api/patients/${id}/treatments`] as const;

const getPatientTreatments = (
  id: number,
  options?: RequestInit,
): Promise<TreatmentHistoryItem[]> =>
  customFetch<TreatmentHistoryItem[]>(getGetPatientTreatmentsUrl(id), {
    ...options,
    method: 'GET',
  });

export function useGetPatientTreatments<
  TData = TreatmentHistoryItem[],
  TError = unknown,
>(
  id: number,
  options?: {
    query?: UseQueryOptions<TreatmentHistoryItem[], TError, TData>;
    request?: RequestInit;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey =
    queryOptions?.queryKey ?? getGetPatientTreatmentsQueryKey(id);
  const queryFn = ({ signal }: { signal?: AbortSignal }) =>
    getPatientTreatments(id, { signal, ...requestOptions });
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: !!id,
    ...queryOptions,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return Object.assign(query, { queryKey });
}
