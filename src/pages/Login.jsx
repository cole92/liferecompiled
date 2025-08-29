import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";

const Login = () => {
  // State za cuvanje unetih vrednosti
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // State za cuvanje gresaka
  const [errors, setErrors] = useState({});

  // State za spiner (Pracenje da li je registracija u toku)
  const [loading, setLoading] = useState(false);

  // Kreiranje navigate funkcije
  const navigate = useNavigate();
  // Kreiranje loaction funkcije
  const location = useLocation();

  // Automatsko popunjavanje email-a iz state-a
  // useEffect prati da li je email prosledjen iz Register strane
  // Ako jeste, postavlja ga u formu i resetuje state kako bi se izbegla ponovna upotreba
  useEffect(() => {
    if (location.state?.email) {
      setFormData((prevState) => ({
        ...prevState,
        email: location.state.email,
      }));
      // Resetujemo state nakon preuzimanja email-a
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  // Mapa friendly user Firebase gresaka
  const firebaseErrorMessages = {
    "auth/user-not-found": "Invalid email or password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your connection and try again.",
    "auth/user-disabled": "Your account has been disabled. Please contact support.",
  };

  // Funkcija za obradu prijave
  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Provera da li su input polja prazna
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    // Provera formata email-a
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Ako postoje greske, prekidamo procesiranje
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Ako nema gresaka, zapocinjemo proces logovanja
    setLoading(true); // Aktiviraj spinner
    try {
      // Pokusaj prijave korisnka
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      // Poruka o uspesnoj prijavi
      toast.success("Login successful! Redirecting to dashboard...", {
        autoClose: 2000,
      });
      // Preusmeravanje na dashboard
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error) {
      // Prikaz friendly user Firebase gresaka
      const message =
        firebaseErrorMessages[error.code] || "An unexpected error occurred. Please try again.";
      toast.error(message);
    } finally {
      // Uklanjamo spiner
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="text-center mb-4">Log In</h2>
      {/* Forma za prijavu sa validacijom */}
      <form onSubmit={handleLogin} noValidate>
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
            autoComplete="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
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
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
          />
          {errors.password && <p className="text-danger">{errors.password}</p>}
        </div>
        {loading ? (
          <Spinner message="" />
        ) : (
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        )}
      </form>
    </div>
  );
};

export default Login;
