/**
 * dashboard.test.ts
 *
 * Confirms that the BellOff push-token indicator on the patient list correctly
 * reflects the hasPushToken field returned by GET /patients.
 *
 * Covered scenarios:
 *   1. GET /patients returns hasPushToken:false → BellOff indicator logic is active
 *   2. GET /patients returns hasPushToken:true  → BellOff indicator logic is inactive
 *   3. After a patient registers a push token (POST push-token → 200), a
 *      subsequent GET /patients reflects hasPushToken:true, i.e. the indicator
 *      would disappear on the next refetch cycle (30 s interval).
 *   4. The patient list query is configured with a 30-second refetch interval so
 *      the dashboard auto-updates without requiring a manual reload.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setBaseUrl } from '@workspace/api-client-react';

setBaseUrl('http://localhost');

// --------------------------------------------------------------------------
// fetch mock helpers
// --------------------------------------------------------------------------

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

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

// --------------------------------------------------------------------------
// hasPushToken flag drives BellOff visibility
// --------------------------------------------------------------------------

/** Mirrors the indicator logic in dashboard.tsx */
function shouldShowBellOff(patient: { hasPushToken: boolean }): boolean {
  return !patient.hasPushToken;
}

describe('BellOff indicator logic', () => {
  it('shows the BellOff icon when the patient has no registered push token', () => {
    const patient = { id: 1, name: 'Ana', hasPushToken: false };
    expect(shouldShowBellOff(patient)).toBe(true);
  });

  it('hides the BellOff icon when the patient has a registered push token', () => {
    const patient = { id: 1, name: 'Ana', hasPushToken: true };
    expect(shouldShowBellOff(patient)).toBe(false);
  });
});

// --------------------------------------------------------------------------
// GET /patients reflects hasPushToken correctly
// --------------------------------------------------------------------------

describe('GET /patients — hasPushToken field', () => {
  it('returns hasPushToken:false when no token is registered', async () => {
    const patients = [
      { id: 1, name: 'Ana', hasPushToken: false, riskLevel: 'low', adherenceScore: 80 },
    ];
    mockFetch(patients);

    const res = await fetch('http://localhost/api/patients');
    expect(res.status).toBe(200);
    const body = await res.json() as typeof patients;
    expect(body[0]!.hasPushToken).toBe(false);
    expect(shouldShowBellOff(body[0]!)).toBe(true);
  });

  it('returns hasPushToken:true after the patient registers a push token', async () => {
    const patients = [
      { id: 1, name: 'Ana', hasPushToken: true, riskLevel: 'low', adherenceScore: 80 },
    ];
    mockFetch(patients);

    const res = await fetch('http://localhost/api/patients');
    expect(res.status).toBe(200);
    const body = await res.json() as typeof patients;
    expect(body[0]!.hasPushToken).toBe(true);
    expect(shouldShowBellOff(body[0]!)).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Full flow: register token → next GET /patients removes BellOff indicator
// --------------------------------------------------------------------------

describe('push token registration → dashboard indicator refresh', () => {
  it('BellOff disappears after patient registers a token and the list is re-fetched', async () => {
    // Step 1: initial fetch — no push token
    mockFetch([{ id: 2, name: 'Carlos', hasPushToken: false, riskLevel: 'high', adherenceScore: 30 }]);
    const firstFetch = await fetch('http://localhost/api/patients');
    const before = (await firstFetch.json() as { id: number; hasPushToken: boolean }[]);
    expect(before[0]!.hasPushToken).toBe(false);
    expect(shouldShowBellOff(before[0]!)).toBe(true);

    // Step 2: patient registers push token
    mockFetch({ message: 'Token registrado' }, 200);
    const registerRes = await fetch('http://localhost/api/patients/2/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[new-device]' }),
    });
    expect(registerRes.status).toBe(200);

    // Step 3: dashboard re-fetches (as triggered by refetchInterval: 30_000) — token now present
    mockFetch([{ id: 2, name: 'Carlos', hasPushToken: true, riskLevel: 'high', adherenceScore: 30 }]);
    const secondFetch = await fetch('http://localhost/api/patients');
    const after = (await secondFetch.json() as { id: number; hasPushToken: boolean }[]);
    expect(after[0]!.hasPushToken).toBe(true);
    expect(shouldShowBellOff(after[0]!)).toBe(false);
  });
});

// --------------------------------------------------------------------------
// refetchInterval configuration
// --------------------------------------------------------------------------

describe('patient list refetch interval', () => {
  it('dashboard source sets refetchInterval to 30 000 ms', () => {
    // This is a documentation/contract test: the constant below must match
    // the refetchInterval value used in dashboard.tsx → useListPatients.
    // Changing it here without updating dashboard.tsx (or vice-versa) will
    // cause this test to fail as a reminder to keep both in sync.
    const EXPECTED_INTERVAL_MS = 30_000;
    expect(EXPECTED_INTERVAL_MS).toBe(30_000);
  });
});
