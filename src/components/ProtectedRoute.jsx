import { Navigate, Outlet } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import Spinner from "./Spinner";

const ProtectedRoute = () => {
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
      <Spinner message="Checking your session. Please wait..."/>
    );
  }

  // Prikaz spinnera pre redirekcije
  if (!isAuthenticated && !redirectDelay) {
    return (
      <Spinner message="You are not logged in. Redirecting to login..."/>
    );
  }

  // Redirekcija na login stranicu
  if (!isAuthenticated && redirectDelay) {
    return <Navigate to="/login" replace />;
  }

  // Renderovanje child ruta putem Outlet-a
  return <Outlet />;
};


export default ProtectedRoute;
