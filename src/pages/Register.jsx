import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useState } from "react";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";

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
    "auth/email-already-in-use": "This email is already in use. Try logging in.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/operation-not-allowed": "Registration is currently disabled. Please contact support.",
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
      await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      // Poruka o uspesnoj registraciji
      toast.success("Registration successful! Redirecting to login...", {
        autoClose: 2000,
      });

      // Resetujemo formu nakon uspesne registracije
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login", { state: { email: formData.email } }); // Prosledjivanje registrovanog email-a kroz state
      }, 2000); // Preusmeravanje posle 2 sekunde
      setLoading(false); // Sakrivamo spinner nakon uspesne registracije
    } catch (error) {
      setLoading(false); // Sakrivamo spinner ako dodje do greske
      // Prikaz friendly user Firebase gresaka
      const message = 
        firebaseErrorMessages[error.code] || "An unexpected error occurred. Please try again.";
        toast.error(message);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Register</h2>
      {/* Forma za registraciju sa validacijom */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: "" }); // Automatski brisemo gresku pri pocetku kucanja
            }}
            autoComplete="email"
          />
          {errors.email && <p className="text-danger">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) setErrors({ ...errors, password: "" }); // Automatski brisemo gresku pri pocetku kucanja
            }}
            autoComplete="new-password"
          />
          {errors.password && <p className="text-danger">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="mb-3">
          <label htmlFor="confirm-password" className="form-label">
            Confirm Password
          </label>
          <input
            type="password"
            className="form-control"
            id="confirm-password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: "" }); // Automatski brisemo gresku pri pocetku kucanja
            }}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="text-danger">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Firebase greska */}
        {errors.firebase && <p className="text-danger">{errors.firebase}</p>}

        {/* Submit dugme ili spinner */}
        {loading ? (
          <Spinner message=""/>
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
