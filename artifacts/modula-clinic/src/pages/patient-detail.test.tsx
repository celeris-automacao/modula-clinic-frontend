/**
 * patient-detail.test.tsx
 *
 * Renders the PatientDetail page and verifies no React warnings are emitted.
 * The global setup (src/test/setup.ts) turns any matching console.error /
 * console.warn into a hard test failure.
 *
 * Photo-thumbnail tests (BR-photo):
 *   - photo task with photoDataUrl → thumbnail button + img
 *   - clicking thumbnail → enlarged dialog opens
 *   - photo task without photoDataUrl → Camera placeholder icon
 *   - non-photo task with note → note text, no photo element
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  useCreateTaskLog: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdatePatientGoalWeight: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useGetPatientTreatments: vi.fn(() => ({ data: [], isLoading: false })),
  useGetTodayTasks: vi.fn(() => ({ data: undefined })),
  getGetPatientQueryKey: (id: number) => ['patient', id],
  getGetPatientAdherenceQueryKey: (id: number) => ['adherence', id],
  getGetPatientProgressQueryKey: (id: number) => ['progress', id],
  getGetActiveTreatmentQueryKey: (id: number) => ['treatment', id],
  getGetLatestInsightQueryKey: (id: number) => ['insight', id],
  getGetDashboardSummaryQueryKey: () => ['dashboardSummary'],
  getGetTodayTasksQueryKey: (id: number) => ['todayTasks', id],
  getListPatientsQueryKey: () => ['patients'],
  getGetPatientTreatmentsQueryKey: (id: number) => ['treatments', id],
}));

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('wouter', () => ({
  useRoute: vi.fn(() => [true, { id: '1' }]),
  useLocation: () => ['/pacientes/1', vi.fn()],
  useSearch: () => '',
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

  it('shows a no-activity warning and disables close buttons when treatment has no activity', async () => {
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Maria Souza', goal: 'Emagrecimento', age: 35, hasActiveTreatment: true },
    } as any);

    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 0, trend: 'stable', riskLevel: 'none',
        currentStreakDays: 0, missedLast3Days: 0, weeklyCompletionPct: 0,
        computedAt: new Date().toISOString(), categoryBreakdown: [],
      },
    } as any);

    // hasActivity: false — no task logs recorded for this treatment yet
    vi.mocked(apiClient.useGetActiveTreatment).mockReturnValue({
      data: {
        id: 10, patientId: 1, protocolId: 1,
        protocolName: 'Protocolo Padrão', status: 'active',
        startedAt: new Date().toISOString(), durationWeeks: 12,
        hasActivity: false, tasks: [],
      },
    } as any);

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PatientDetail />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('button', { name: /encerrar tratamento/i }));

    expect(screen.getByTestId('no-activity-warning')).toBeInTheDocument();
    screen.getByText('Nenhuma atividade registrada');

    // Both action buttons must be disabled (BR-050)
    expect(screen.getByRole('button', { name: /cancelar tratamento/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /marcar como concluído/i })).toBeDisabled();
  });

  it('does not show the warning and leaves close buttons enabled when treatment has historical activity but score is 0', async () => {
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Maria Souza', goal: 'Emagrecimento', age: 35, hasActiveTreatment: true },
    } as any);

    // Score can be 0 for many reasons (e.g. falling behind recently); hasActivity is the correct signal
    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 0, trend: 'stable', riskLevel: 'none',
        currentStreakDays: 0, missedLast3Days: 0, weeklyCompletionPct: 0,
        computedAt: new Date().toISOString(), categoryBreakdown: [],
      },
    } as any);

    // hasActivity: true — logs exist even though current adherence window is 0
    vi.mocked(apiClient.useGetActiveTreatment).mockReturnValue({
      data: {
        id: 10, patientId: 1, protocolId: 1,
        protocolName: 'Protocolo Padrão', status: 'active',
        startedAt: new Date().toISOString(), durationWeeks: 12,
        hasActivity: true, tasks: [],
      },
    } as any);

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PatientDetail />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('button', { name: /encerrar tratamento/i }));

    expect(screen.queryByTestId('no-activity-warning')).not.toBeInTheDocument();

    // Buttons must remain enabled — the backend decides if closure is valid
    expect(screen.getByRole('button', { name: /cancelar tratamento/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /marcar como concluído/i })).not.toBeDisabled();
  });

  it('shows an inline log form for each missing mandatory category and submits via createTaskLog', async () => {
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Maria Souza', goal: 'Emagrecimento', age: 35, hasActiveTreatment: true },
    } as any);

    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 50, trend: 'stable', riskLevel: 'none',
        currentStreakDays: 0, missedLast3Days: 0, weeklyCompletionPct: 50,
        computedAt: new Date().toISOString(), categoryBreakdown: [],
      },
    } as any);

    vi.mocked(apiClient.useGetActiveTreatment).mockReturnValue({
      data: {
        id: 10, patientId: 1, protocolId: 1,
        protocolName: 'Protocolo Padrão', status: 'active',
        startedAt: new Date().toISOString(), durationWeeks: 12,
        hasActivity: true,
        missingMandatoryCategories: ['weight'],
        tasks: [
          { id: 101, title: 'Pesagem semanal', category: 'weight', frequency: 'weekly', mandatory: true },
        ],
      },
    } as any);

    const mutate = vi.fn();
    vi.mocked(apiClient.useCreateTaskLog).mockReturnValue({ mutate, isPending: false } as any);

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PatientDetail />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('button', { name: /encerrar tratamento/i }));

    expect(screen.getByTestId('missing-mandatory-warning')).toBeInTheDocument();
    const form = screen.getByTestId('inline-log-form-weight');
    expect(form).toBeInTheDocument();

    const input = screen.getByLabelText('Peso');
    await user.type(input, '82.5');
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    expect(mutate).toHaveBeenCalledWith(
      { data: { taskId: 101, patientId: 1, valueNumber: 82.5 } },
      expect.anything(),
    );
  });

  it('shows a friendly toast and refreshes state on a duplicate-period (409) rejection', async () => {
    toastSpy.mockClear();
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Maria Souza', goal: 'Emagrecimento', age: 35, hasActiveTreatment: true },
    } as any);

    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 50, trend: 'stable', riskLevel: 'none',
        currentStreakDays: 0, missedLast3Days: 0, weeklyCompletionPct: 50,
        computedAt: new Date().toISOString(), categoryBreakdown: [],
      },
    } as any);

    vi.mocked(apiClient.useGetActiveTreatment).mockReturnValue({
      data: {
        id: 10, patientId: 1, protocolId: 1,
        protocolName: 'Protocolo Padrão', status: 'active',
        startedAt: new Date().toISOString(), durationWeeks: 12,
        hasActivity: true,
        missingMandatoryCategories: ['weight'],
        tasks: [
          { id: 101, title: 'Pesagem semanal', category: 'weight', frequency: 'weekly', mandatory: true },
        ],
      },
    } as any);

    // Simulate the server rejecting with BR-035 duplicate-period conflict
    const mutate = vi.fn((_vars: unknown, opts?: { onError?: (err: unknown) => void }) => {
      opts?.onError?.({ status: 409, data: { error: 'Tarefa já registrada neste período de frequência (BR-035)' } });
    });
    vi.mocked(apiClient.useCreateTaskLog).mockReturnValue({ mutate, isPending: false } as any);

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PatientDetail />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('button', { name: /encerrar tratamento/i }));
    await user.type(screen.getByLabelText('Peso'), '82.5');
    await user.click(screen.getByRole('button', { name: /registrar/i }));

    // Friendly message, not a generic destructive error
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tarefa já registrada' }),
    );
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('hides the missing-mandatory warning once no categories are missing', async () => {
    vi.mocked(apiClient.useGetPatient).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Maria Souza', goal: 'Emagrecimento', age: 35, hasActiveTreatment: true },
    } as any);

    vi.mocked(apiClient.useGetPatientAdherence).mockReturnValue({
      isLoading: false,
      data: {
        score: 50, trend: 'stable', riskLevel: 'none',
        currentStreakDays: 0, missedLast3Days: 0, weeklyCompletionPct: 50,
        computedAt: new Date().toISOString(), categoryBreakdown: [],
      },
    } as any);

    vi.mocked(apiClient.useGetActiveTreatment).mockReturnValue({
      data: {
        id: 10, patientId: 1, protocolId: 1,
        protocolName: 'Protocolo Padrão', status: 'active',
        startedAt: new Date().toISOString(), durationWeeks: 12,
        hasActivity: true,
        missingMandatoryCategories: [],
        tasks: [
          { id: 101, title: 'Pesagem semanal', category: 'weight', frequency: 'weekly', mandatory: true },
        ],
      },
    } as any);

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PatientDetail />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('button', { name: /encerrar tratamento/i }));

    expect(screen.queryByTestId('missing-mandatory-warning')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /marcar como concluído/i })).not.toBeDisabled();
  });
});

// ─── Photo thumbnail tests (BR-photo) ─────────────────────────────────────

/** Sets up a patient with hasActiveTreatment:true and a given todayTasks list. */
function renderWithTasks(tasks: unknown[]) {
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
      score: 72,
      trend: 'stable',
      riskLevel: 'none',
      currentStreakDays: 3,
      missedLast3Days: 1,
      weeklyCompletionPct: 72,
      computedAt: new Date().toISOString(),
      categoryBreakdown: [],
    },
  } as any);

  vi.mocked(apiClient.useGetTodayTasks).mockReturnValue({
    data: tasks,
  } as any);

  return render(<PatientDetail />, { wrapper: makeWrapper() });
}

describe('PatientDetail — photo thumbnails (BR-photo)', () => {
  it('renders a thumbnail button with an img when a photo task has photoDataUrl', () => {
    renderWithTasks([
      {
        taskId: 10,
        title: 'Foto corporal',
        category: 'photo',
        mandatory: false,
        completedToday: true,
        photoDataUrl: 'data:image/png;base64,abc123',
        note: null,
      },
    ]);

    // The thumbnail button must be present
    const btn = screen.getByRole('button', { name: /ver foto ampliada/i });
    expect(btn).toBeInTheDocument();

    // The thumbnail img must be present and have the correct src
    const img = screen.getByAltText('Foto registrada pelo paciente');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('opens the enlarged dialog when the thumbnail button is clicked', () => {
    renderWithTasks([
      {
        taskId: 11,
        title: 'Foto corporal',
        category: 'photo',
        mandatory: false,
        completedToday: true,
        photoDataUrl: 'data:image/jpeg;base64,xyz789',
        note: null,
      },
    ]);

    const btn = screen.getByRole('button', { name: /ver foto ampliada/i });
    fireEvent.click(btn);

    // After clicking, the dialog should open and show the full-size image.
    // The dialog renders an <img> with the same src (and there may be two in
    // the DOM — thumbnail + enlarged — so we find the one inside the dialog
    // by its alt text and verify the src is correct).
    const images = screen.getAllByAltText('Foto registrada pelo paciente');
    const enlargedImg = images.find((el) =>
      el.classList.contains('rounded-xl') &&
      el.classList.contains('object-contain'),
    );
    expect(enlargedImg).toBeInTheDocument();
    expect(enlargedImg).toHaveAttribute('src', 'data:image/jpeg;base64,xyz789');
  });

  it('renders the Camera placeholder for a photo task with no photoDataUrl', () => {
    renderWithTasks([
      {
        taskId: 12,
        title: 'Foto semanal',
        category: 'photo',
        mandatory: false,
        completedToday: false,
        photoDataUrl: null,
        note: null,
      },
    ]);

    // No thumbnail button
    expect(screen.queryByRole('button', { name: /ver foto ampliada/i })).toBeNull();

    // Camera placeholder container exists (aria-hidden SVG, detect by task title)
    screen.getByText('Foto semanal');

    // The placeholder renders a Camera icon — check its wrapper div exists
    // by confirming neither a thumbnail img nor an enlarged dialog img is in the DOM
    expect(screen.queryByAltText('Foto registrada pelo paciente')).toBeNull();
  });

  it('renders note text for a non-photo task and no photo element', () => {
    renderWithTasks([
      {
        taskId: 20,
        title: 'Beber água',
        category: 'water',
        mandatory: true,
        completedToday: true,
        photoDataUrl: null,
        note: 'Bebi 2 litros hoje',
      },
    ]);

    // Note is visible
    screen.getByText('Bebi 2 litros hoje');

    // No photo thumbnail button or img
    expect(screen.queryByRole('button', { name: /ver foto ampliada/i })).toBeNull();
    expect(screen.queryByAltText('Foto registrada pelo paciente')).toBeNull();
  });
});
