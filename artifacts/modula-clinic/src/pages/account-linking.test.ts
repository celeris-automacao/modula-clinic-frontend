/**
 * account-linking.test.ts
 *
 * End-to-end contract tests for the account-linking flow:
 *   1. Professional links a patient  → PATCH /patients/:id sets userId
 *   2. Patient sees their journey    → GET  /patients/me returns the linked record
 *   3. Linking with an active treatment → patient sees protocolName / hasActiveTreatment
 *   4. Linking with no active treatment → patient still gets a record, no protocol
 *   5. Re-linking to a different account → new userId replaces the old one
 *   6. Unlinking (userId: null)      → GET /patients/me returns 404 for that user
 *
 * All tests use a global fetch mock — no real server required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { linkPatientAccount, getMyPatient } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'content-type': 'application/json' }),
    clone: function () { return this; },
  } as unknown as Response);
}

/** Minimal Patient fixture with sane defaults that can be spread-overridden. */
function makePatient(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Ana Silva',
    goal: 'Perder peso',
    age: 30,
    startWeightKg: 95,
    currentWeightKg: 91,
    nextAppointment: null,
    userId: 'user-abc',
    adherenceScore: 80,
    riskLevel: 'low',
    trend: 'stable',
    hasActiveTreatment: false,
    protocolName: null,
    insightSummary: null,
    lastActivityAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Professional links a patient (PATCH /patients/:id)
// ---------------------------------------------------------------------------

describe('PATCH /patients/:id — professional links a patient account', () => {
  it('returns the updated patient record with the new userId', async () => {
    const linked = makePatient({ userId: 'user-abc' });
    mockFetch(linked);

    const result = await linkPatientAccount(1, { userId: 'user-abc' });

    expect(result.userId).toBe('user-abc');
    expect(result.id).toBe(1);
    expect(result.name).toBe('Ana Silva');
  });

  it('calls the correct PATCH endpoint for the given patient id', async () => {
    mockFetch(makePatient({ userId: 'user-abc' }));

    await linkPatientAccount(7, { userId: 'user-abc' });

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/patients/7');
    expect((init as RequestInit).method?.toUpperCase()).toBe('PATCH');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ userId: 'user-abc' });
  });

  it('returns 404 when the patient id does not exist', async () => {
    mockFetch({ error: 'Paciente não encontrado' }, 404);

    await expect(linkPatientAccount(9999, { userId: 'user-xyz' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Patient sees their journey (GET /patients/me)
// ---------------------------------------------------------------------------

describe('GET /patients/me — patient sees their linked record immediately', () => {
  it('returns the patient summary after the account has been linked', async () => {
    const me = makePatient({ userId: 'user-abc' });
    mockFetch(me);

    const result = await getMyPatient();

    expect(result.id).toBe(1);
    expect(result.userId).toBe('user-abc');
  });

  it('calls the /patients/me endpoint (no id in the URL)', async () => {
    mockFetch(makePatient());

    await getMyPatient();

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toMatch(/\/patients\/me$/);
    expect(url).not.toMatch(/\/patients\/\d+/);
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockFetch({ error: 'Não autenticado' }, 401);

    await expect(getMyPatient()).rejects.toThrow();
  });

  it('returns 404 when no patient is linked to the authenticated user', async () => {
    mockFetch({ error: 'Nenhum paciente vinculado a este usuário' }, 404);

    await expect(getMyPatient()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Linking when a treatment IS active
// ---------------------------------------------------------------------------

describe('account linking — patient with an active treatment', () => {
  it('GET /patients/me reflects hasActiveTreatment and protocolName after linking', async () => {
    mockFetch(
      makePatient({
        userId: 'user-abc',
        hasActiveTreatment: true,
        protocolName: 'Protocolo Emagrecimento Fase 1',
        adherenceScore: 72,
        riskLevel: 'medium',
      }),
    );

    const result = await getMyPatient();

    expect(result.hasActiveTreatment).toBe(true);
    expect(result.protocolName).toBe('Protocolo Emagrecimento Fase 1');
    expect(result.adherenceScore).toBe(72);
  });

  it('PATCH /patients/:id returns hasActiveTreatment from the server when treatment is active', async () => {
    mockFetch(
      makePatient({
        userId: 'user-abc',
        hasActiveTreatment: true,
        protocolName: 'Protocolo Emagrecimento Fase 1',
      }),
    );

    const result = await linkPatientAccount(1, { userId: 'user-abc' });

    expect(result.hasActiveTreatment).toBe(true);
    expect(result.protocolName).toBe('Protocolo Emagrecimento Fase 1');
  });
});

// ---------------------------------------------------------------------------
// 4. Linking when NO treatment is active
// ---------------------------------------------------------------------------

describe('account linking — patient with no active treatment', () => {
  it('GET /patients/me still succeeds and hasActiveTreatment is false', async () => {
    mockFetch(
      makePatient({
        userId: 'user-abc',
        hasActiveTreatment: false,
        protocolName: null,
      }),
    );

    const result = await getMyPatient();

    expect(result.hasActiveTreatment).toBe(false);
    expect(result.protocolName).toBeNull();
    // The patient record exists — no 404 even without a treatment
    expect(result.id).toBe(1);
  });

  it('PATCH /patients/:id succeeds even when the patient has no active treatment', async () => {
    mockFetch(makePatient({ userId: 'user-new', hasActiveTreatment: false }));

    const result = await linkPatientAccount(1, { userId: 'user-new' });

    expect(result.userId).toBe('user-new');
    expect(result.hasActiveTreatment).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Re-linking to a different account
// ---------------------------------------------------------------------------

describe('account linking — re-linking to a different user account', () => {
  it('PATCH /patients/:id replaces the old userId with the new one', async () => {
    // First link
    mockFetch(makePatient({ userId: 'user-old' }));
    const first = await linkPatientAccount(1, { userId: 'user-old' });
    expect(first.userId).toBe('user-old');

    // Re-link to a new account
    mockFetch(makePatient({ userId: 'user-new' }));
    const second = await linkPatientAccount(1, { userId: 'user-new' });
    expect(second.userId).toBe('user-new');
  });

  it('after re-linking, GET /patients/me with the new credentials returns the patient', async () => {
    mockFetch(makePatient({ userId: 'user-new', hasActiveTreatment: true, protocolName: 'P1' }));

    const result = await getMyPatient();

    expect(result.userId).toBe('user-new');
    expect(result.hasActiveTreatment).toBe(true);
  });

  it('after re-linking, GET /patients/me with the OLD credentials returns 404', async () => {
    // The old user is no longer linked — server returns 404
    mockFetch({ error: 'Nenhum paciente vinculado a este usuário' }, 404);

    await expect(getMyPatient()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Unlinking (userId: null)
// ---------------------------------------------------------------------------

describe('account unlinking — PATCH /patients/:id with userId: null', () => {
  it('PATCH /patients/:id returns the patient with userId null after unlinking', async () => {
    mockFetch(makePatient({ userId: null }));

    const result = await linkPatientAccount(1, { userId: null });

    expect(result.userId).toBeNull();
  });

  it('after unlinking, GET /patients/me returns 404 for that user', async () => {
    mockFetch({ error: 'Nenhum paciente vinculado a este usuário' }, 404);

    await expect(getMyPatient()).rejects.toThrow();
  });
});
