import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../context/AuthContext";

const ProtectedRouteLoading = ({ message = "Checking your session..." }) => (
  <div className="py-6 sm:py-8">
    <section
      className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            Session
          </p>
          <h1 className="mt-1 text-lg font-semibold text-zinc-100">
            {message}
          </h1>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-zinc-900" />
          <div className="h-4 w-4/5 rounded bg-zinc-900" />
          <div className="h-10 w-32 rounded-xl bg-zinc-900" />
        </div>
      </div>
    </section>
  </div>
);

ProtectedRouteLoading.propTypes = {
  message: PropTypes.string,
};

/**
 * @component ProtectedRoute
 * Protected route that renders children only when user is authenticated.
 *
 * - Shows a compact skeleton while auth check is in progress (isCheckingAuth)
 * - If user is not authenticated, shows a short loading state before redirect
 * - After 500ms redirects to /login and preserves "from" location for post-login return
 *
 * @returns {JSX.Element} Outlet if authenticated, otherwise loading state or redirect
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
    return <ProtectedRouteLoading />;
  }

  if (!isAuthenticated && !redirectDelay) {
    return <ProtectedRouteLoading message="Redirecting to login..." />;
  }

  if (!isAuthenticated && redirectDelay) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
