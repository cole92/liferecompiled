import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import Spinner from "./Spinner";

/**
 * @component ProtectedRoute
 * Protected route that renders children only when user is authenticated.
 *
 * - Shows Spinner while auth check is in progress (isCheckingAuth)
 * - If user is not authenticated, shows a short spinner before redirect
 * - After 500ms redirects to /login and preserves "from" location for post-login return
 *
 * @returns {JSX.Element} Outlet if authenticated, otherwise spinner or redirect
 */

const ProtectedRoute = () => {
  const { isAuthenticated, isCheckingAuth } = useContext(AuthContext);
  const [redirectDelay, setRedirectDelay] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth) {
      const timer = setTimeout(() => {
        setRedirectDelay(true);
      }, 500);

      return () => clearTimeout(timer);
    }

    // If auth becomes true again, reset delay state
    if (isAuthenticated) {
      setRedirectDelay(false);
    }
  }, [isAuthenticated, isCheckingAuth]);

  if (isCheckingAuth) {
    return <Spinner message="Checking your session. Please wait..." />;
  }

  if (!isAuthenticated && !redirectDelay) {
    return <Spinner message="You are not logged in. Redirecting to login..." />;
  }

  if (!isAuthenticated && redirectDelay) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
