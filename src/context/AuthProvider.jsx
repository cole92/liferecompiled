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

const VERIFY_SESSION_KEY = "lr_verify_required_toast_shown";
const SUPPRESS_VERIFY_TOAST_KEY = "lr_suppress_verify_toast_once";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

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

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userProfileError, setUserProfileError] = useState(null);

  const navigate = useNavigate();

  // Avoid repeating signOut in auth listener
  const isSigningOutUnverifiedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      (async () => {
        setIsCheckingAuth(true);

        if (!currentUser) {
          setUser(null);
          setIsAuthenticated(false);
          setUserProfileError(null);
          setIsCheckingAuth(false);
          return;
        }

        // Refresh verification flag (never block forever)
        try {
          await withTimeout(currentUser.reload(), 4000);
        } catch (error) {
          void error;
        }

        // Enforce verification globally
        if (!currentUser.emailVerified) {
          setUser(null);
          setIsAuthenticated(false);
          setUserProfileError(null);
          setIsCheckingAuth(false);

          // If Register already showed "verification sent" toast,
          // suppress this global verify-required toast once.
          const suppressOnce = safeSessionGet(SUPPRESS_VERIFY_TOAST_KEY);
          if (suppressOnce) {
            safeSessionRemove(SUPPRESS_VERIFY_TOAST_KEY);
          } else {
            const alreadyShown = safeSessionGet(VERIFY_SESSION_KEY);
            if (!alreadyShown) {
              showInfoToast(
                "Please verify your email before using the app. Check your inbox and then log in again.",
                { toastId: "auth-verify-required", autoClose: 3500 },
              );
              safeSessionSet(VERIFY_SESSION_KEY, "1");
            }
          }

          // Fire-and-forget signOut so UI never locks
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

        // Verified user -> clear session flags
        safeSessionRemove(VERIFY_SESSION_KEY);
        safeSessionRemove(SUPPRESS_VERIFY_TOAST_KEY);

        // Verified -> load profile from Firestore
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

          // Soft fallback: keep user logged in (verified) but minimal data
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

  const logout = async () => {
    try {
      if (!navigator.onLine) {
        showErrorToast(
          "You are offline. Please connect to the internet and try again.",
        );
        return;
      }

      setIsLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await signOut(auth);

      showSuccessToast(
        "You have been logged out successfully. Redirecting to login...",
      );

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
