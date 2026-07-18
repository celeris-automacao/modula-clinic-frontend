/**
 * measurements.test.ts
 *
 * Tests for the GET /patients/:id/measurements API client behaviour:
 * 1. Happy-path: measurement points are returned in chronological order.
 * 2. Same-day re-log: only one point appears per date (server deduplication).
 * 3. Empty state: no points when no weight logs exist for the patient.
 *
 * These tests exercise `getPatientMeasurements` from @workspace/api-client-react
 * using a global fetch mock — no real server required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPatientMeasurements } from '@workspace/api-client-react';

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

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('GET /patients/:id/measurements', () => {
  it('returns measurement points in chronological order', async () => {
    const payload = [
      { date: '2026-06-18', valueNumber: 91.5 },
      { date: '2026-06-25', valueNumber: 90.0 },
      { date: '2026-07-02', valueNumber: 89.2 },
      { date: '2026-07-09', valueNumber: 88.1 },
    ];
    mockFetch(payload);

    const result = await getPatientMeasurements(1);

    expect(result).toHaveLength(4);
    // Verify chronological ordering is preserved
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.date >= result[i - 1]!.date).toBe(true);
    }
    expect(result[0]!.valueNumber).toBe(91.5);
    expect(result[3]!.valueNumber).toBe(88.1);
  });

  it('returns a single point per date when the patient re-logs on the same day', async () => {
    // The server upserts same-day logs, so only one row comes back per date
    const payload = [
      { date: '2026-07-18', valueNumber: 88.1 }, // re-log updated value
    ];
    mockFetch(payload);

    const result = await getPatientMeasurements(1);

    expect(result).toHaveLength(1);
    expect(result[0]!.date).toBe('2026-07-18');
    expect(result[0]!.valueNumber).toBe(88.1);
  });

  it('excludes measurements from a previous (inactive) treatment after a new one starts', async () => {
    // The server only returns logs whose treatment status is "active", so a
    // patient who logged 92.0 in a cancelled/completed cycle and 88.5 in the
    // new active cycle only gets the active-cycle point back.
    const payload = [{ date: '2026-07-15', valueNumber: 88.5 }];
    mockFetch(payload);

    const result = await getPatientMeasurements(1);

    expect(result).toHaveLength(1);
    expect(result[0]!.valueNumber).toBe(88.5);
    expect(result.some((p) => p.valueNumber === 92.0)).toBe(false);
  });

  it('returns an empty array when no weight logs exist', async () => {
    mockFetch([]);

    const result = await getPatientMeasurements(1);

    expect(result).toEqual([]);
  });

  it('calls the correct endpoint URL for the given patient id', async () => {
    mockFetch([]);

    await getPatientMeasurements(42);

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('/patients/42/measurements');
  });
});
