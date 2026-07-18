import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ─── Intercept React warnings and fail the test ────────────────────────────
//
// React emits "uncontrolled → controlled" (and other lifecycle) warnings via
// console.error.  We capture every call and, after each test, assert that none
// of them matched the React warning pattern.  This turns silent regressions
// into hard test failures.

const reactWarningPatterns = [
  /Warning:/i,
  /Each child in a list should have a unique "key" prop/i,
  /An update to .+ inside a test was not wrapped in act/i,
  /Cannot update a component \(`[^`]+`\) while rendering a different component/i,
];

let consoleErrors: string[] = [];
let consoleWarns: string[] = [];

const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

beforeEach(() => {
  consoleErrors = [];
  consoleWarns = [];

  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ');
    consoleErrors.push(message);
    // Still forward to the original so output is visible in the terminal
    originalError(...args);
  });

  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ');
    consoleWarns.push(message);
    originalWarn(...args);
  });
});

afterEach(() => {
  // Check for React warnings in console.error output
  const reactErrors = consoleErrors.filter((msg) =>
    reactWarningPatterns.some((pattern) => pattern.test(msg)),
  );
  const reactWarnings = consoleWarns.filter((msg) =>
    reactWarningPatterns.some((pattern) => pattern.test(msg)),
  );

  vi.restoreAllMocks();
  cleanup();

  if (reactErrors.length > 0) {
    throw new Error(
      `React console.error warning(s) detected — fix before merging:\n` +
        reactErrors.map((m) => `  • ${m}`).join('\n'),
    );
  }

  if (reactWarnings.length > 0) {
    throw new Error(
      `React console.warn warning(s) detected — fix before merging:\n` +
        reactWarnings.map((m) => `  • ${m}`).join('\n'),
    );
  }
});
