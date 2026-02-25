import { createContext } from "react";

/**
 * Global authentication context.
 *
 * Provides the current auth state (user, loading, etc.)
 * and related helpers via a dedicated AuthProvider.
 *
 * Kept separate from implementation details to avoid tight coupling
 * and to allow clean consumption through `useContext(AuthContext)`.
 *
 * NOTE:
 * - Default value is intentionally undefined.
 * - Consumers should always be wrapped in <AuthProvider>.
 */
export const AuthContext = createContext();
