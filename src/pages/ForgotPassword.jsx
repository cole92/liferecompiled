import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { showErrorToast, showInfoToast } from "../utils/toastUtils";
import Spinner from "../components/Spinner";

const ForgotPassword = () => {
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);

      // Neutral message to avoid account existence leaks
      showInfoToast(
        "If an account exists for this email, we sent password reset instructions.",
        { toastId: "reset-sent", autoClose: 3500 }
      );
    } catch (err) {
      // Keep neutral for user-not-found and similar
      if (err?.code === "auth/user-not-found") {
        showInfoToast(
          "If an account exists for this email, we sent password reset instructions.",
          { toastId: "reset-sent", autoClose: 3500 }
        );
      } else if (err?.code === "auth/network-request-failed") {
        showErrorToast("Network error. Please check your connection and try again.");
      } else {
        showErrorToast("Could not start reset flow. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "ui-input";
  const inputErr = "border-rose-500/80 focus-visible:ring-0 focus-visible:ring-offset-0";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 py-10">
      <div className="ui-card w-full p-6 sm:p-8">
        <h2 className="text-center text-3xl font-semibold text-zinc-100">
          Reset Password
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-300">
          Enter your email and we will send reset instructions.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="reset-email" className="ui-label">
              Email address
            </label>

            <input
              id="reset-email"
              type="email"
              className={`${inputBase} ${error ? inputErr : ""}`}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "reset-email-error" : undefined}
              required
            />

            {error && (
              <p id="reset-email-error" className="ui-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-2">
              <Spinner message="" />
            </div>
          ) : (
            <button type="submit" className="ui-button-primary w-full py-2.5">
              Send reset email
            </button>
          )}

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link
              to="/login"
              className="text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4"
            >
              Back to login
            </Link>

            <Link
              to="/register"
              className="text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4"
            >
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
