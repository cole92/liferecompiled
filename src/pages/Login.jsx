import { useState } from "react";

const Login = () => {
  // State za cuvanje unetih vrednosti 
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // Funkcija za 
  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Submitted', formData);
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Log In</h2>
      {/* Forma za prijavu sa validacijom */}
      <form onSubmit={handleLogin}>
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
              setFormData({...formData, email: e.target.value})
            }}
          />
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
              setFormData({...formData, password: e.target.value})
            }}
          />
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
