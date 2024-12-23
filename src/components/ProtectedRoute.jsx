import { Navigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isCheckingAuth } = useContext(AuthContext);
  const [redirectDelay, setRedirectDelay] = useState(false);

  // Kada korisnik nije autentifikovan, postavljamo kasnjenje
  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth) {
      const timer = setTimeout(() => {
        setRedirectDelay(true); // Postavljamo stanje za redirekciju nakon 500ms
      }, 500);

      return () => clearTimeout(timer); // Cistimo timer pri unmount-u
    }
  }, [isAuthenticated, isCheckingAuth]);

  // Prikaz spinnera tokom provere autentifikacije
  if (isCheckingAuth) {
    return (
      <div className="center-spinner">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-center mt-3">Verifying your session...</p>
      </div>
    );
  }

  // Prikaz spinnera pre redirekcije
  if (!isAuthenticated && !redirectDelay) {
    return (
      <div className="center-spinner">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-center mt-3">Redirecting to login...</p>
      </div>
    );
  }

  // Redirekcija na login stranicu
  if (!isAuthenticated && redirectDelay) {
    return <Navigate to="/login" replace />;
  }

  // Ako je autentifikovan, prikazujemo decu komponente
  return children;
};

// PropTypes validacija za `children`
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired, // `children` mora biti React Node i obavezan je
};

export default ProtectedRoute;
