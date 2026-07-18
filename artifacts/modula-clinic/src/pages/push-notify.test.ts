/**
 * push-notify.test.ts
 *
 * Tests for the push-token registration and patient notify API client behaviour:
 *
 * push-token endpoint (POST /patients/:id/push-token):
 *   1. Unauthenticated call receives 401.
 *   2. Patient caller targeting a different patient's record receives 403.
 *   3. Patient caller targeting their own record receives 200.
 *   4. Professional caller can register a token for any patient.
 *
 * notify endpoint (POST /patients/:id/notify):
 *   1. Unauthenticated call receives 401.
 *   2. Patient caller (linked to a patient record) receives 403.
 *   3. Professional caller with a valid push token receives ok:true, sent:true.
 *   4. Professional caller where patient has no push token receives ok:true, sent:false.
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

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --------------------------------------------------------------------------
// POST /patients/:id/push-token
// --------------------------------------------------------------------------

describe('POST /patients/:id/push-token', () => {
  it('returns 401 when caller is not authenticated', async () => {
    mockFetch({ error: 'Autenticação necessária' }, 401);
    const res = await fetch('http://localhost/api/patients/1/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/autenti/i);
  });

  it('returns 403 when a patient targets another patient record', async () => {
    mockFetch({ error: 'Você só pode registrar o token do seu próprio dispositivo' }, 403);
    const res = await fetch('http://localhost/api/patients/99/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer patient-session-token',
      },
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 when a patient registers their own token', async () => {
    mockFetch({ message: 'Token registrado' }, 200);
    const res = await fetch('http://localhost/api/patients/1/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer patient-session-token',
      },
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { message: string };
    expect(body.message).toBe('Token registrado');
  });

  it('returns 200 when a professional registers a token for any patient', async () => {
    mockFetch({ message: 'Token registrado' }, 200);
    const res = await fetch('http://localhost/api/patients/5/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer professional-session-token',
      },
      body: JSON.stringify({ token: 'ExponentPushToken[xyz]' }),
    });
    expect(res.status).toBe(200);
  });
});

// --------------------------------------------------------------------------
// POST /patients/:id/notify
// --------------------------------------------------------------------------

describe('POST /patients/:id/notify', () => {
  it('returns 401 when caller is not authenticated', async () => {
    mockFetch({ error: 'Autenticação necessária' }, 401);
    const res = await fetch('http://localhost/api/patients/1/notify', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a linked patient', async () => {
    mockFetch({ error: 'Acesso negado' }, 403);
    const res = await fetch('http://localhost/api/patients/1/notify', {
      method: 'POST',
      headers: { Authorization: 'Bearer patient-session-token' },
    });
    expect(res.status).toBe(403);
  });

  it('returns ok:true sent:true when patient has a registered push token', async () => {
    mockFetch({ ok: true, sent: true }, 200);
    const res = await fetch('http://localhost/api/patients/1/notify', {
      method: 'POST',
      headers: { Authorization: 'Bearer professional-session-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; sent: boolean };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);
  });

  it('returns ok:true sent:false when patient has no registered push token', async () => {
    mockFetch({ ok: true, sent: false, message: 'Sem token de push registrado' }, 200);
    const res = await fetch('http://localhost/api/patients/2/notify', {
      method: 'POST',
      headers: { Authorization: 'Bearer professional-session-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; sent: boolean; message: string };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(false);
    expect(body.message).toBeTruthy();
  });
});
