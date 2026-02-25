import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth, signOut } from "../firebase";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "../utils/toastUtils";
import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";

/**
 * @helper withTimeout
 * Defensive wrapper to prevent UI stalls on slow network/reload calls.
 * - Used for best-effort `user.reload()` (auth state freshness)
 * - Rejects after `ms` so the login flow can continue with a fallback behavior
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
 * @helper safeSignOut
 * Fire-and-forget sign out used after verification gates.
 * - Keeps UI responsive (no awaiting)
 * - Swallows errors to avoid masking the primary user-facing message
 *
 * @returns {Promise<void>}
 */
function safeSignOut() {
  return signOut(auth).catch(() => {});
}

/**
 * @component Login
 *
 * Login page with strict email verification gate.
 * - Validates credentials client-side (fast feedback) before calling Firebase
 * - Signs in via Firebase Auth and re-checks `emailVerified` after a best-effort reload
 * - Blocks access until email is verified, with a "resend verification" recovery path
 *
 * Security notes:
 * - Uses generic auth error messages where possible to reduce account enumeration risk
 * - Signs out immediately when verification is missing so protected routes remain gated
 *
 * @returns {JSX.Element}
 */
const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [verifyRequired, setVerifyRequired] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Optional prefill from navigation state (e.g., after Register/Forgot Password).
    // We then replace the current entry to avoid keeping stale state in history.
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }));
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  // Centralized mapping to keep UI messages consistent across auth error variants.
  const firebaseErrorMessages = {
    "auth/user-not-found": "Invalid email or password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/wrong-password": "Invalid email or password. Please try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection and try again.",
    "auth/user-disabled":
      "Your account has been disabled. Please contact support.",
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    // Lightweight client-side email check (Firebase remains the source of truth).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Primary login flow:
   * - Attempt sign-in
   * - Best-effort refresh to read latest `emailVerified`
   * - Gate the session until verified
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setVerifyRequired(false);

    if (!validate()) return;

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      // Best-effort refresh: do not block UX on slow reload calls.
      try {
        await withTimeout(cred.user.reload(), 4000);
      } catch (error) {
        void error;
      }

      if (!cred.user.emailVerified) {
        setVerifyRequired(true);

        showInfoToast(
          "Please verify your email before logging in. Check your inbox.",
          {
            toastId: "login-verify-required",
            autoClose: 3500,
          },
        );

        // Sign out so protected routes stay gated until verification is complete.
        safeSignOut();
        return;
      }

      showSuccessToast("Login successful! Redirecting...", {
        autoClose: 1800,
        toastId: "login-success",
      });

      // If routed here from a protected page, return there; otherwise go home.
      const from = location.state?.from?.pathname || "/";
      setTimeout(() => navigate(from, { replace: true }), 300);
    } catch (error) {
      const message =
        firebaseErrorMessages[error.code] ||
        "An unexpected error occurred. Please try again.";
      showErrorToast(message, { toastId: "login-error" });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recovery flow for unverified users:
   * - Re-authenticate to get a `User` instance (required by `sendEmailVerification`)
   * - If already verified, stop and inform user
   * - Otherwise send verification email and sign out afterwards
   */
  const handleResendVerification = async () => {
    if (!formData.email || !formData.password) {
      showErrorToast(
        "Enter your email and password to resend the verification email.",
      );
      return;
    }

    setResendLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      try {
        await withTimeout(cred.user.reload(), 4000);
      } catch (error) {
        void error;
      }

      if (cred.user.emailVerified) {
        showSuccessToast("Your email is already verified. Please log in.", {
          toastId: "already-verified",
        });
        safeSignOut();
        setVerifyRequired(false);
        return;
      }

      await sendEmailVerification(cred.user);

      showSuccessToast(
        "Verification email sent again. Please check your inbox.",
        {
          toastId: "verify-resent",
          autoClose: 3000,
        },
      );

      // End the session after sending to keep the verification gate consistent.
      safeSignOut();
    } catch (error) {
      const message =
        firebaseErrorMessages[error.code] ||
        "Could not resend verification email. Please try again.";
      showErrorToast(message, { toastId: "verify-resent-error" });
      safeSignOut();
    } finally {
      setResendLoading(false);
    }
  };

  const inputBase = "ui-input";
  const inputErr =
    "border-rose-500/80 focus-visible:ring-0 focus-visible:ring-offset-0";
  const inputOk = "";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 py-10">
      <div className="ui-card w-full p-6 sm:p-8">
        <h2 className="text-center text-3xl font-semibold text-zinc-100">
          Log In
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-300">
          Enter your credentials to continue.
        </p>

        <form
          onSubmit={handleLogin}
          noValidate
          aria-busy={loading ? "true" : "false"}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="ui-label">
              Email address
            </label>

            <input
              type="email"
              className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
              id="email"
              name="email"
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });

                // Clear field error on edit to reduce "stuck" error state.
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
            />

            {errors.email && (
              <p id="email-error" className="ui-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="ui-label">
              Password
            </label>

            <input
              type="password"
              className={`${inputBase} ${errors.password ? inputErr : inputOk}`}
              id="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });

                if (errors.password) setErrors({ ...errors, password: "" });
              }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
            />

            {errors.password && (
              <p id="password-error" className="ui-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-sm">
            <Link
              to="/forgot-password"
              state={{ email: formData.email || "" }}
              className="text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4"
            >
              Forgot password?
            </Link>

            <Link
              to="/register"
              className="text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4"
            >
              Create account
            </Link>
          </div>

          {verifyRequired && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-zinc-100">
              <p className="font-semibold">Verify your email</p>
              <p className="mt-1 text-zinc-200/90">
                We sent a verification email to your inbox. Please verify your
                email and then log in again.
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="ui-button-primary w-full sm:w-auto"
                >
                  {resendLoading ? "Sending..." : "Resend verification"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifyRequired(false);

                    // Keeps guidance visible without changing auth state.
                    showInfoToast("After verifying, please log in again.", {
                      toastId: "verify-try-again",
                    });
                  }}
                  className="ui-button-secondary w-full sm:w-auto"
                >
                  I verified, let me log in
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-2">
              <Spinner message="" />
            </div>
          ) : (
            <button type="submit" className="ui-button-primary w-full py-2.5">
              Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
