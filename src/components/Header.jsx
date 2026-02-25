import { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AvatarDropdown from "./AvatarDropdown";
import Spinner from "./Spinner";
import BrandWordmark from "./ui/BrandWordmark";

/**
 * @component Header
 *
 * Global app header (brand + auth area).
 *
 * - Stays sticky at the top for constant navigation context
 * - Shows an auth-check loading state to avoid UI flicker during startup
 * - Renders either avatar dropdown (authenticated) or login/register links (guest)
 * - Hides login/register buttons on their respective routes to reduce redundancy
 *
 * Notes:
 * - No Home toolbar or Create button belongs here (kept intentionally minimal)
 *
 * @returns {JSX.Element}
 */
const Header = () => {
  const { user, isLoggingOut, logout, isCheckingAuth } =
    useContext(AuthContext);

  const { pathname } = useLocation();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  // Avoid rendering guest/auth UI until auth state is resolved (prevents flicker)
  if (isCheckingAuth) {
    return (
      <header className="sticky top-0 z-50 w-full">
        <div className="w-full border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur ring-1 ring-zinc-100/5">
          <div className="ui-shell-header py-3">
            <div className="flex items-center gap-2 text-sm text-zinc-200">
              <span>Checking authentication</span>
              <Spinner message="" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  const authBtnBase = "ui-button-outline";

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="w-full border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur ring-1 ring-zinc-100/5">
        <div className="ui-shell-header py-3">
          <div className="flex items-center justify-between gap-3">
            <BrandWordmark className="shrink-0" tagline="CODE-POWERED" />

            <div className="flex items-center gap-2">
              {user ? (
                <AvatarDropdown
                  user={user}
                  logout={logout}
                  isLoggingOut={isLoggingOut}
                />
              ) : (
                <>
                  {/* Hide Login button when already on /login */}
                  {!isLogin && (
                    <NavLink
                      to="/login"
                      className={`${authBtnBase} border-blue-500/40 text-blue-200 hover:bg-blue-500/10`}
                    >
                      Login
                    </NavLink>
                  )}

                  {/* Hide Register button when already on /register */}
                  {!isRegister && (
                    <NavLink
                      to="/register"
                      className={`${authBtnBase} border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10`}
                    >
                      Register
                    </NavLink>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
