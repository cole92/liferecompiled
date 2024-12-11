import { useState } from "react";

const Register = () => {
  // State za cuvanje vrednosti input polja
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  // State za cuvanje gresaka validacije
  const [errors, setErrors] = useState({});

  // Funkcija za validaciju forme i procesiranje unosa
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Provera da li su input polja prazna
    // Ako su prazna, dodajemo odgovarajuce greske
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required";
    }

    // Provera formata email-a
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
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

    // Azuriranje state-a sa greskama
    setErrors(newErrors);

    // Ako nema gresaka, dozvoljavamo procesiranje
    if (Object.keys(newErrors).length === 0) {
      console.log("Form submitted successfully!");
    }
  };
  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Register</h2>
      {/* Forma za registraciju sa validacijom */}
      <form onSubmit={handleSubmit}>
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
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="text-danger">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn btn-primary w-100">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
