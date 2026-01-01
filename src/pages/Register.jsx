import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

const Register = () => {
  // State za cuvanje vrednosti input polja
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State za cuvanje gresaka validacije
  const [errors, setErrors] = useState({});

  // State za spiner (Pracenje da li je registracija u toku)
  const [loading, setLoading] = useState(false);

  // Kreiranje navigate funkcije
  const navigate = useNavigate();

  // Mapa friendly user Firebase gresaka
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

  // Funkcija za validaciju forme i procesiranje unosa
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Provera da li su input polja prazna
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required";
    }

    // Provera formata email-a
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format. Please try again.";
    }

    // Provera da li lozinka ima minimum 6 karaktera
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    // Provera da li lozinka sadrzi bar jedno veliko slovo
    if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    }

    // Provera da li lozinka sadrzi bar jedan broj
    if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    // Provera poklapanja lozinki
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Ako postoje greske, prekidamo procesiranje
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Ako nema gresaka, zapocni proces registracije na Firebase-u
    setLoading(true); // Aktiviraj spinner
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Kreiranje korisnickog dokumenta u Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: "",
        bio: "",
        status: "Active",
        profilePicture: DEFAULT_PROFILE_PICTURE,
        email: user.email,
        createdAt: new Date(),
      });

      // Poruka o uspesnoj registraciji
      toast.success("Registration successful! Redirecting...", {
        autoClose: 1200,
      });

      // Reset forme (opciono, ali ne mora jer ides na drugu stranu)
      setFormData({ email: "", password: "", confirmPassword: "" });

      setTimeout(() => {
        navigate("/dashboard/settings"); // ili tvoja ruta za edit profil
      }, 1200);
    } catch (error) {
      // Prikaz friendly user Firebase gresaka
      const message =
        firebaseErrorMessages[error.code] ||
        "An unexpected error occurred. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false); // Sakrivamo spinner nakon procesa
    }
  };

  return (
    <div className="form-container">
      <h2 className="text-center mb-4">Register</h2>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading ? "true" : "false"}
      >
        {/* Email */}
        <div className="mb-3">
          <label htmlFor="register-email" className="form-label">
            Email address
          </label>

          <input
            type="email"
            className={`form-control ${errors.email ? "is-invalid" : ""}`}
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
            aria-describedby={errors.email ? "register-email-error" : undefined}
            required
          />

          {errors.email && (
            <p
              id="register-email-error"
              className="text-danger mt-1 mb-0"
              role="alert"
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label htmlFor="register-password" className="form-label">
            Password
          </label>

          <input
            type="password"
            className={`form-control ${errors.password ? "is-invalid" : ""}`}
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
              className="text-danger mt-1 mb-0"
              role="alert"
            >
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-3">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm Password
          </label>

          <input
            type="password"
            className={`form-control ${
              errors.confirmPassword ? "is-invalid" : ""
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
              className="text-danger mt-1 mb-0"
              role="alert"
            >
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {loading ? (
          <Spinner message="" />
        ) : (
          <button type="submit" className="btn btn-primary w-100">
            Register
          </button>
        )}
      </form>
    </div>
  );
};
export default Register;
