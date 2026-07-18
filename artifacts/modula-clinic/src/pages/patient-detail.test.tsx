/**
 * patient-detail.test.tsx
 *
 * Renders the PatientDetail page and verifies no React warnings are emitted.
 * The global setup (src/test/setup.ts) turns any matching console.error /
 * console.warn into a hard test failure.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiClient from '@workspace/api-client-react';
import PatientDetail from './patient-detail';

// ─── Mock API hooks ────────────────────────────────────────────────────────

vi.mock('@workspace/api-client-react', () => ({
  useGetPatient: vi.fn(() => ({
    data: {
      id: 1,
      name: 'Maria Souza',
      goal: 'Emagrecimento',
      age: 35,
      hasActiveTreatment: false,
    },
    isLoading: false,
  })),
  useGetPatientAdherence: vi.fn(() => ({ data: undefined, isLoading: false })),
  useGetPatientProgress: vi.fn(() => ({ data: undefined })),
  useGetActiveTreatment: vi.fn(() => ({ data: undefined })),
  useGetLatestInsight: vi.fn(() => ({ data: undefined, isLoading: false })),
  useGenerateInsight: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useListProtocols: vi.fn(() => ({ data: undefined, isLoading: true })),
  useCreateTreatment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePublishTreatment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCompleteTreatment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelTreatment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useLinkPatientAccount: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  getGetPatientQueryKey: (id: number) => ['patient', id],
  getGetPatientAdherenceQueryKey: (id: number) => ['adherence', id],
  getGetPatientProgressQueryKey: (id: number) => ['progress', id],
  getGetActiveTreatmentQueryKey: (id: number) => ['treatment', id],
  getGetLatestInsightQueryKey: (id: number) => ['insight', id],
  getGetDashboardSummaryQueryKey: () => ['dashboardSummary'],
  getListPatientsQueryKey: () => ['patients'],
}));

vi.mock('wouter', () => ({
  useRoute: vi.fn(() => [true, { id: '1' }]),
  useLocation: () => ['/pacientes/1', vi.fn()],
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('PatientDetail page', () => {
  it('renders without React warnings when patient has no active treatment', () => {
    render(<PatientDetail />, { wrapper: makeWrapper() });
    screen.getByText('Maria Souza');
    screen.getByText('Nenhum Tratamento Ativo');
  });

  it('Select for protocol has a controlled empty-string value on mount', () => {
    // ApplyProtocolCard renders with selectedProtocolId="" — must not emit
    // an uncontrolled→controlled warning.
    render(<PatientDetail />, { wrapper: makeWrapper() });
    screen.getByText('Aplicar Protocolo');
  });

  it('renders adherence section when patient has an active treatment', () => {
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        name: 'Maria Souza',
        goal: 'Emagrecimento',
        age: 35,
        hasActiveTreatment: true,
      },
    } as any);

    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 82,
        trend: 'up',
        riskLevel: 'none',
        currentStreakDays: 5,
        missedLast3Days: 0,
        weeklyCompletionPct: 85,
        computedAt: new Date().toISOString(),
        categoryBreakdown: [],
      },
    } as any);

    render(<PatientDetail />, { wrapper: makeWrapper() });
    screen.getByText('Radar de Adesão');
  });
});
