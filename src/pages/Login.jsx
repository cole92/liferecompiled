import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";
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

      toast.success("Login successful! Redirecting to dashboard...", {
        autoClose: 2000,
      });

      setTimeout(() => {
        navigate("/");
      }, 500);
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
          Log In
        </h2>
        <p className="mt-1 text-center text-sm text-zinc-400">
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
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-200"
            >
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
              <p id="email-error" className="text-sm text-red-400" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-200"
            >
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
              <p
                id="password-error"
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.password}
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
              Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
