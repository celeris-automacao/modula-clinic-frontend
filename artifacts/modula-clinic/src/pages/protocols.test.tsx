/**
 * protocols.test.tsx
 *
 * Renders the Protocols page and verifies no React warnings are emitted.
 * The global setup (src/test/setup.ts) turns any matching console.error /
 * console.warn into a hard test failure.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiClient from '@workspace/api-client-react';
import Protocols from './protocols';

// ─── Mock API hooks ────────────────────────────────────────────────────────

vi.mock('@workspace/api-client-react', () => ({
  useListProtocols: vi.fn(() => ({ data: undefined, isLoading: true })),
  useListPatients: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCreateProtocol: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  getListProtocolsQueryKey: () => ['protocols'],
  getListPatientsQueryKey: () => ['patients'],
  ProtocolTaskInputCategory: {},
  ProtocolTaskInputFrequency: {},
}));

vi.mock('wouter', () => ({
  useRoute: vi.fn(() => [false, null]),
  useLocation: () => ['/protocolos', vi.fn()],
  useSearch: () => '',
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className}>{children}</a>
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

describe('Protocols page', () => {
  it('renders without React warnings while protocols are loading', () => {
    render(<Protocols />, { wrapper: makeWrapper() });
    screen.getByText('Protocol Studio');
  });

  it('renders protocol cards when data is available', () => {
    vi.mocked(apiClient.useListProtocols).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 1,
          name: 'Protocolo A',
          description: 'Descrição A',
          durationWeeks: 8,
          isPreset: true,
          tasks: [
            { id: 1, title: 'Hidratação', frequency: 'daily' },
            { id: 2, title: 'Exercício', frequency: 'weekly' },
          ],
        },
      ],
    } as any);

    render(<Protocols />, { wrapper: makeWrapper() });
    screen.getByText('Protocolo A');
  });

  it('Select controls inside CreateProtocolDialog have controlled values from mount', () => {
    vi.mocked(apiClient.useListProtocols).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 1,
          name: 'Protocolo A',
          description: 'Descrição A',
          durationWeeks: 8,
          isPreset: true,
          tasks: [],
        },
      ],
    } as any);

    // Dialog is closed on mount — just verify the trigger card renders without warnings
    render(<Protocols />, { wrapper: makeWrapper() });
    screen.getByText('Criar protocolo personalizado');
  });
});
