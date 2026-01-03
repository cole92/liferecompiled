import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format. Please try again.";
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    }

    if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: "",
        bio: "",
        status: "Active",
        profilePicture: DEFAULT_PROFILE_PICTURE,
        email: user.email,
        createdAt: new Date(),
      });

      toast.success("Registration successful! Redirecting...", {
        autoClose: 1200,
      });

      setFormData({ email: "", password: "", confirmPassword: "" });

      setTimeout(() => {
        navigate("/dashboard/settings");
      }, 1200);
    } catch (error) {
      const message =
        firebaseErrorMessages[error.code] ||
        "An unexpected error occurred. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const inputOk = "border-zinc-700";
  const inputErr = "border-red-500";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 shadow-sm">
        <h2 className="text-center text-2xl font-semibold text-zinc-100">
          Register
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-400">
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
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-zinc-200"
            >
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
              <p
                id="register-email-error"
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-zinc-200"
            >
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
              <p
                id="register-password-error"
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label
              htmlFor="register-confirm-password"
              className="block text-sm font-medium text-zinc-200"
            >
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
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: "" });
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
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-2">
              <Spinner message="" />
            </div>
          ) : (
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Register
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Register;
