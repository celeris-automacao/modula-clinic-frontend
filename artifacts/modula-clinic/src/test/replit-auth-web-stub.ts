// Stub for @workspace/replit-auth-web used during unit tests.
// The real package is not yet present in the workspace; tests mock it via vi.mock.
// This file only needs to exist so Vite can resolve the import in the module graph.
export const useAuth = () => ({ user: null, isLoading: false });
export const AuthProvider = ({ children }: { children: unknown }) => children;
export const getAuthToken = () => null;
