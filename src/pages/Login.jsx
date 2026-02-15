import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";
import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.email) {
      setFormData((prevState) => ({
        ...prevState,
        email: location.state.email,
      }));
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  const firebaseErrorMessages = {
    "auth/user-not-found": "Invalid email or password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection and try again.",
    "auth/user-disabled":
      "Your account has been disabled. Please contact support.",
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);

      showSuccessToast("Login successful! Redirecting to home...", {
        autoClose: 2000,
      });

      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error) {
      const message =
        firebaseErrorMessages[error.code] ||
        "An unexpected error occurred. Please try again.";
      showErrorToast(message);
    } finally {
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
          {/* Email */}
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

          {/* Password */}
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
