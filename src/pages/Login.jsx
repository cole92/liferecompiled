import { useState } from "react";

const Login = () => {
  // State za cuvanje unetih vrednosti
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // State za cuvanje gresaka
  const [errors, setErrors] = useState({});

  // Funkcija za obradu prijave
  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Submitted", formData);
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
  };

  return (
    <div className="container mt-5">
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
            }}
          />
          {errors.password && <p className="text-danger">{errors.password}</p>}
        </div>
        {/* Log In dugme */}
        <button type="submit" className="btn btn-primary w-100">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
