import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

import { auth, db } from "../firebase";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "../utils/toastUtils";
import Spinner from "../components/Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

const SUPPRESS_VERIFY_TOAST_KEY = "lr_suppress_verify_toast_once";

/**
 * @component Register
 *
 * Registration screen (email + password).
 *
 * What it does:
 * - Validates user input (email + password rules + confirm password)
 * - Creates a Firebase Auth user (email/password)
 * - Writes a Firestore user profile document in "users/{uid}"
 * - Sends a verification email
 * - Redirects to /login immediately (verification required before login)
 *
 * UX / Security notes:
 * - Email verification is required before allowing login (enforced elsewhere).
 * - We suppress the "verify required" toast once because Register already shows it.
 * - Firestore write and verification email are started without awaiting to keep UI snappy.
 */
const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Map Firebase Auth error codes to user-friendly messages.
  const firebaseErrorMessages = {
    "auth/email-already-in-use":
      "This email is already in use. Try logging in.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
    "auth/operation-not-allowed":
      "Registration is currently disabled. Please contact support.",
  };

  /**
   * Validate the form and return a populated errors object.
   *
   * @param {object} data
   * @returns {object} errors
   */
  const validate = (data) => {
    const nextErrors = {};

    if (!data.email) nextErrors.email = "Email is required";
    if (!data.password) nextErrors.password = "Password is required";
    if (!data.confirmPassword) {
      nextErrors.confirmPassword = "Confirm Password is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      nextErrors.email = "Invalid email format. Please try again.";
    }

    if (data.password && data.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters long";
    }

    if (data.password && !/[A-Z]/.test(data.password)) {
      nextErrors.password =
        "Password must contain at least one uppercase letter";
    }

    if (data.password && !/\d/.test(data.password)) {
      nextErrors.password = "Password must contain at least one number";
    }

    if (
      data.password &&
      data.confirmPassword &&
      data.password !== data.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    return nextErrors;
  };

  /**
   * Submit handler:
   * - Validate
   * - Create auth user
   * - Start Firestore profile write (non-blocking)
   * - Start verification email (non-blocking)
   * - Redirect to login
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate(formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    // Suppress AuthProvider "verify required" toast once after successful register.
    // (Register already shows the "verification email sent" toast.)
    try {
      sessionStorage.setItem(SUPPRESS_VERIFY_TOAST_KEY, "1");
    } catch (err) {
      void err;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      const user = userCredential.user;

      // 1) Start user profile write (do NOT await).
      setDoc(doc(db, "users", user.uid), {
        name: "",
        bio: "",
        status: "Active",
        profilePicture: DEFAULT_PROFILE_PICTURE,
        email: user.email,
        createdAt: new Date(),
      }).catch((err) => {
        void err;
        showInfoToast(
          "Account created, but we could not finish profile setup yet. Please try logging in again later.",
          { toastId: "register-profile-write-failed", autoClose: 3500 },
        );
      });

      // 2) Start verification email (do NOT await).
      sendEmailVerification(user)
        .then(() => {
          showSuccessToast(
            "Account created! Verification email sent. Please verify and then log in.",
            { toastId: "register-verification-sent", autoClose: 3500 },
          );
        })
        .catch((err) => {
          void err;
          showInfoToast(
            "Account created, but we could not send the verification email. Please log in to resend it.",
            { toastId: "register-verification-send-failed", autoClose: 3500 },
          );
        });

      // 3) Reset UI state and redirect to login immediately.
      setFormData({ email: "", password: "", confirmPassword: "" });
      setLoading(false);

      navigate("/login", {
        replace: true,
        state: { email: user.email, justRegistered: true },
      });

      // NOTE: We do NOT signOut here. AuthProvider enforces signOut for unverified users globally.
    } catch (error) {
      // If register failed, remove suppress flag so AuthProvider behaves normally.
      try {
        sessionStorage.removeItem(SUPPRESS_VERIFY_TOAST_KEY);
      } catch (err) {
        void err;
      }

      const message =
        firebaseErrorMessages[error.code] ||
        "An unexpected error occurred. Please try again.";
      showErrorToast(message);

      setLoading(false);
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
          Register
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-300">
          Create your account to start posting.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={loading ? "true" : "false"}
          className="mt-6 space-y-4"
        >
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="register-email" className="ui-label">
              Email address
            </label>

            <input
              type="email"
              className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
              id="register-email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "register-email-error" : undefined
              }
              required
            />

            {errors.email && (
              <p id="register-email-error" className="ui-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="register-password" className="ui-label">
              Password
            </label>

            <input
              type="password"
              className={`${inputBase} ${errors.password ? inputErr : inputOk}`}
              id="register-password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: "" });
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "register-password-error" : undefined
              }
              required
            />

            {errors.password && (
              <p id="register-password-error" className="ui-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label htmlFor="register-confirm-password" className="ui-label">
              Confirm Password
            </label>

            <input
              type="password"
              className={`${inputBase} ${
                errors.confirmPassword ? inputErr : inputOk
              }`}
              id="register-confirm-password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: "" });
                }
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? "register-confirm-password-error"
                  : undefined
              }
              required
            />

            {errors.confirmPassword && (
              <p
                id="register-confirm-password-error"
                className="ui-error"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          {loading ? (
            <div className="flex justify-center py-2">
              <Spinner message="" />
            </div>
          ) : (
            <button type="submit" className="ui-button-primary w-full py-2.5">
              Register
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Register;
