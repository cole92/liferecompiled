import { Navigate, Outlet } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import Spinner from "./Spinner";

/**
 * @component ProtectedRoute
 * Zasticena ruta koja prikazuje child komponente samo ako je korisnik autentifikovan.
 *
 * - Prikazuje Spinner dok traje provera autentifikacije (`isCheckingAuth`)
 * - Ako korisnik nije autentifikovan, prikazuje kratak spinner pre redirekcije
 * - Nakon 500ms prikazuje <Navigate> ka /login
 *
 * @returns {JSX.Element} `Outlet` ako je user ulogovan, u suprotnom spinner ili redirekcija
 */

const ProtectedRoute = () => {
  const { isAuthenticated, isCheckingAuth } = useContext(AuthContext);
  const [redirectDelay, setRedirectDelay] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth) {
      const timer = setTimeout(() => {
        setRedirectDelay(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isCheckingAuth]);

  if (isCheckingAuth) {
    return <Spinner message="Checking your session. Please wait..." />;
  }

  if (!isAuthenticated && !redirectDelay) {
    return <Spinner message="You are not logged in. Redirecting to login..." />;
  }

  if (!isAuthenticated && redirectDelay) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
