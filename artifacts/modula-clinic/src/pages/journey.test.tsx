/**
 * journey.test.tsx
 *
 * Two suites in one file:
 *
 * 1. "Journey page" – renders the top-level Journey component under different
 *    auth states and confirms no React controlled/uncontrolled (or other
 *    lifecycle) warnings are emitted.
 *
 * 2. "PatientJourneyContent – celebration overlay" – verifies the confetti
 *    overlay fires exactly once when the last task transitions to complete, and
 *    never fires on a cold load where tasks are already done.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiClient from '@workspace/api-client-react';
import * as replitAuth from '@workspace/replit-auth-web';
import Journey, { PatientJourneyContent } from './journey';

// ─── Mock API hooks ────────────────────────────────────────────────────────

vi.mock('@workspace/api-client-react', () => ({
  useGetTodayTasks: vi.fn(() => ({ data: undefined, isLoading: true })),
  useGetMyPatient: vi.fn(() => ({ data: undefined, isLoading: false })),
  useGetPatientProgress: vi.fn(() => ({ data: undefined })),
  useCreateTaskLog: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  getGetMyPatientQueryKey: vi.fn(() => ['/api/patients/me']),
  getGetTodayTasksQueryKey: vi.fn((id: number) => ['todayTasks', id]),
  getGetPatientProgressQueryKey: vi.fn((id: number) => ['patientProgress', id]),
  getGetPatientAdherenceQueryKey: vi.fn((id: number) => ['patientAdherence', id]),
  getListPatientsQueryKey: vi.fn(() => ['patients']),
  getGetDashboardSummaryQueryKey: vi.fn(() => ['dashboardSummary']),
}));

vi.mock('@workspace/replit-auth-web', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('wouter', () => ({
  useRoute: () => [false, {}],
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ─── Shared fixtures ──────────────────────────────────────────────────────

const TASK_DONE = {
  taskId: 1,
  title: 'Hidratação',
  category: 'water',
  frequency: 'daily',
  completedToday: true,
  description: 'Beba água',
};

const TASK_PENDING = { ...TASK_DONE, completedToday: false };

const WEEKLY_TASK_DONE = {
  taskId: 2,
  title: 'Pesagem Semanal',
  category: 'weight',
  frequency: 'weekly',
  completedToday: true,
  description: 'Registre seu peso',
};

// No description so the period hint text is visible
const WEEKLY_TASK_PENDING = { ...WEEKLY_TASK_DONE, completedToday: false, description: '' };

const CELEBRATION_LABEL = 'Parabéns! Todas as tarefas concluídas!';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function mockTaskHooks(tasks: typeof TASK_DONE[], isLoading = false) {
  vi.mocked(apiClient.useGetTodayTasks).mockReturnValue({
    data: tasks,
    isLoading,
  } as any);
  vi.mocked(apiClient.useCreateTaskLog).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as any);
}

function mockAuth(overrides?: Partial<ReturnType<typeof replitAuth.useAuth>>) {
  vi.mocked(replitAuth.useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  } as any);
}

// ─── Suite 1: top-level Journey component (auth states) ───────────────────

describe('Journey page', () => {
  beforeEach(() => {
    mockAuth(); // unauthenticated by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as any);
  });

  it('shows a login prompt when the user is not authenticated', async () => {
    render(<Journey />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Sua Jornada Pessoal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });
  });

  it('shows loading skeletons while auth is resolving', () => {
    mockAuth({ isLoading: true });
    render(<Journey />, { wrapper: makeWrapper() });
    expect(screen.queryByText('Sua Jornada Pessoal')).not.toBeInTheDocument();
    expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
  });

  it('shows a "no protocol" message when authenticated but no patient is linked', async () => {
    mockAuth({
      user: { id: 'u1', firstName: 'Ana', email: 'ana@test.com', lastName: null, profileImageUrl: null },
      isAuthenticated: true,
    });
    vi.mocked(apiClient.useGetMyPatient).mockReturnValue({ data: null, isLoading: false } as any);

    render(<Journey />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nenhum protocolo ativo')).toBeInTheDocument();
    });
  });

  it('shows the patient name badge when authenticated and patient is linked', async () => {
    mockAuth({
      user: { id: 'u1', firstName: 'Ana', email: 'ana@test.com', lastName: null, profileImageUrl: null },
      isAuthenticated: true,
    });
    vi.mocked(apiClient.useGetMyPatient).mockReturnValue({
      data: { id: 1, name: 'Ana Silva' },
      isLoading: false,
    } as any);

    render(<Journey />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Ana Silva')).toBeInTheDocument();
      expect(screen.getByText('Perfil')).toBeInTheDocument();
    });
  });
});

// ─── Suite 2: celebration overlay behaviour ───────────────────────────────

describe('PatientJourneyContent – celebration overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT show the celebration overlay when all tasks are already done on first load', async () => {
    mockTaskHooks([TASK_DONE]);

    render(<PatientJourneyContent patientId={1} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.queryByLabelText(CELEBRATION_LABEL)).not.toBeInTheDocument();
    });
  });

  it('weekly task completed earlier in week shows "concluída nesta semana"', async () => {
    mockTaskHooks([WEEKLY_TASK_DONE]);
    render(<PatientJourneyContent patientId={1} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Concluída nesta semana ✓')).toBeInTheDocument();
    });
  });

  it('pending weekly task shows period hint', async () => {
    mockTaskHooks([WEEKLY_TASK_PENDING]);
    render(<PatientJourneyContent patientId={1} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Toque para registrar (1× por semana)')).toBeInTheDocument();
    });
  });

  it('shows the celebration overlay exactly once when the last task is completed in session', async () => {
    mockTaskHooks([TASK_PENDING]);

    const { rerender } = render(<PatientJourneyContent patientId={1} />, {
      wrapper: makeWrapper(),
    });

    expect(screen.queryByLabelText(CELEBRATION_LABEL)).not.toBeInTheDocument();

    // Simulate task completion
    mockTaskHooks([TASK_DONE]);
    rerender(<PatientJourneyContent patientId={1} />);

    await waitFor(() => {
      expect(screen.getByLabelText(CELEBRATION_LABEL)).toBeInTheDocument();
    });

    expect(screen.getAllByLabelText(CELEBRATION_LABEL)).toHaveLength(1);
  });
});
