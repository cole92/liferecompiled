import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, signOut } from "../firebase";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/toastUtils";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";

// Session-only flags to avoid repeating verify-related toasts across reloads.
const VERIFY_SESSION_KEY = "lr_verify_required_toast_shown";
const SUPPRESS_VERIFY_TOAST_KEY = "lr_suppress_verify_toast_once";

/**
 * Wrap a promise with a hard timeout.
 * Used to avoid UI getting stuck on network calls like `currentUser.reload()`.
 *
 * @param {Promise<any>} promise
 * @param {number} ms
 * @returns {Promise<any>}
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

/**
 * SessionStorage helpers.
 * - Guarded for environments where storage is unavailable (privacy mode, disabled storage).
 * - Fail silently: auth flow should keep working even if storage throws.
 */
function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    void error;
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    void error;
  }
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    void error;
  }
}

/**
 * @component AuthProvider
 *
 * Central auth state manager for the app.
 *
 * Responsibilities:
 * - Listens to Firebase auth state changes and exposes a stable context shape.
 * - Enforces email verification globally (prevents unverified sessions from using the app).
 * - Loads the user profile from Firestore and derives role/admin flags.
 * - Provides a guarded `logout()` with UX feedback (toasts + redirect).
 *
 * UX notes:
 * - Verification toasts are session-gated to avoid spam across refreshes.
 * - Profile load errors degrade gracefully (minimal user object + info toast).
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userProfileError, setUserProfileError] = useState(null);

  const navigate = useNavigate();

  // Prevent duplicate signOut calls when auth listener fires multiple times quickly.
  const isSigningOutUnverifiedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      (async () => {
        setIsCheckingAuth(true);

        // Signed out: reset to a clean baseline.
        if (!currentUser) {
          setUser(null);
          setIsAuthenticated(false);
          setUserProfileError(null);
          setIsCheckingAuth(false);
          return;
        }

        // Refresh verification state without risking an indefinite wait.
        try {
          await withTimeout(currentUser.reload(), 4000);
        } catch (error) {
          void error;
        }

        // Global rule: unverified users are treated as signed out.
        if (!currentUser.emailVerified) {
          setUser(null);
          setIsAuthenticated(false);
          setUserProfileError(null);
          setIsCheckingAuth(false);

          // If registration flow already showed "verification sent", suppress this once.
          const suppressOnce = safeSessionGet(SUPPRESS_VERIFY_TOAST_KEY);
          if (suppressOnce) {
            safeSessionRemove(SUPPRESS_VERIFY_TOAST_KEY);
          } else {
            // Session-gate the info toast to avoid repeated prompts on refresh.
            const alreadyShown = safeSessionGet(VERIFY_SESSION_KEY);
            if (!alreadyShown) {
              showInfoToast(
                "Please verify your email before using the app. Check your inbox and then log in again.",
                { toastId: "auth-verify-required", autoClose: 3500 },
              );
              safeSessionSet(VERIFY_SESSION_KEY, "1");
            }
          }

          // Fire-and-forget signOut to keep the UI responsive.
          if (!isSigningOutUnverifiedRef.current) {
            isSigningOutUnverifiedRef.current = true;

            signOut(auth)
              .catch((error) => {
                void error;
              })
              .finally(() => {
                isSigningOutUnverifiedRef.current = false;
              });
          }

          return;
        }

        // Verified user: clear session flags so future flows can show toasts again if needed.
        safeSessionRemove(VERIFY_SESSION_KEY);
        safeSessionRemove(SUPPRESS_VERIFY_TOAST_KEY);

        // Load user profile data (role/admin) from Firestore.
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          const userData = userSnap.exists() ? userSnap.data() : {};
          const role = userData.role || "user";

          setUser({
            ...userData,
            uid: currentUser.uid,
            email: currentUser.email,
            role,
            isAdmin: role === "admin",
          });

          setIsAuthenticated(true);
          setUserProfileError(null);
        } catch (error) {
          console.error("Greska pri dohvatanju korisnika:", error);

          // Soft fallback: keep session valid, but expose minimal identity fields.
          setUser({
            uid: currentUser.uid,
            email: currentUser.email ?? null,
            displayName: currentUser.displayName ?? null,
            role: "user",
            isAdmin: false,
          });

          setIsAuthenticated(true);
          setUserProfileError(error);

          showInfoToast(
            "We could not fully load your profile. Some features may be limited.",
            { toastId: "auth-profile-soft-fail" },
          );
        } finally {
          setIsCheckingAuth(false);
        }
      })().catch((error) => {
        console.error("AuthProvider onAuthStateChanged error:", error);
        setIsCheckingAuth(false);
      });
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign out the current user with basic offline guarding and UX feedback.
   * Uses a short delay so UI can reflect the action (spinner/disabled state) before redirect.
   *
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      // Avoid confusing failures when offline (Firebase signOut may hang/fail depending on state).
      if (!navigator.onLine) {
        showErrorToast(
          "You are offline. Please connect to the internet and try again.",
        );
        return;
      }

      setIsLoggingOut(true);

      // Small delay to prevent jarring UX when logout is triggered from menus/modals.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await signOut(auth);

      showSuccessToast(
        "You have been logged out successfully. Redirecting to login...",
      );

      // Delay redirect so the success toast is visible.
      setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (error) {
      showErrorToast(
        "Oops! Something went wrong during logout. Please try again.",
      );
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isCheckingAuth,
        isLoggingOut,
        userProfileError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
