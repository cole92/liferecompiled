import { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AvatarDropdown from "./AvatarDropdown";
import Spinner from "./Spinner";
import BrandWordmark from "./ui/BrandWordmark";

/**
 * @component Header
 * Global header (logo + auth/avatar).
 * No Home toolbar or Create button here.
 */
const Header = () => {
  const { user, isLoggingOut, logout, isCheckingAuth } =
    useContext(AuthContext);

  const { pathname } = useLocation();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

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
                  {!isLogin && (
                    <NavLink
                      to="/login"
                      className={`${authBtnBase} border-blue-500/40 text-blue-200 hover:bg-blue-500/10`}
                    >
                      Login
                    </NavLink>
                  )}

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
