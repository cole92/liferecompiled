import { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { AuthContext } from "../context/AuthContext";
import AvatarDropdown from "./AvatarDropdown";
import BrandWordmark from "./ui/BrandWordmark";
import { cx, FOCUS_RING } from "../constants/uiClasses";

const SUPPORT_ROUTE = "/report";

const isDashboardPath = (pathname) =>
  pathname === "/dashboard" || pathname.startsWith("/dashboard/");

const isAuthPath = (pathname) =>
  pathname === "/login" ||
  pathname === "/register" ||
  pathname === "/forgot-password";

const isEditorPath = (pathname) =>
  pathname === "/dashboard/create" || pathname.startsWith("/dashboard/edit/");

const navBase =
  "inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium " +
  "text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 " +
  FOCUS_RING;

const navActive = "bg-zinc-900 text-zinc-100";

const getNavClass = (isActive) => cx(navBase, isActive && navActive);

const DashboardNav = ({ isAdmin }) => (
  <nav
    aria-label="Dashboard navigation"
    className="hidden min-w-0 justify-center lg:flex"
  >
    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
      <NavLink
        to="/dashboard"
        end
        className={({ isActive }) => getNavClass(isActive)}
      >
        My Posts
      </NavLink>

      <NavLink
        to="/dashboard/saved"
        className={({ isActive }) => getNavClass(isActive)}
      >
        Saved
      </NavLink>

      <NavLink
        to="/dashboard/stats"
        className={({ isActive }) => getNavClass(isActive)}
      >
        Stats
      </NavLink>

      <NavLink
        to="/dashboard/trash"
        className={({ isActive }) => getNavClass(isActive)}
      >
        Trash
      </NavLink>

      {isAdmin && (
        <NavLink
          to="/dashboard/moderation"
          className={({ isActive }) => getNavClass(isActive)}
        >
          Moderation
        </NavLink>
      )}
    </div>
  </nav>
);

const PublicNav = ({ showDashboard, pathname }) => (
  <nav
    aria-label="Primary navigation"
    className="hidden min-w-0 justify-center lg:flex"
  >
    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
      <NavLink
        to="/"
        end
        className={({ isActive }) => getNavClass(isActive)}
      >
        Feed
      </NavLink>

      {showDashboard && (
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            getNavClass(isActive || isDashboardPath(pathname))
          }
        >
          Dashboard
        </NavLink>
      )}

      <NavLink
        to="/about"
        className={({ isActive }) => getNavClass(isActive)}
      >
        About
      </NavLink>

      <NavLink
        to={SUPPORT_ROUTE}
        className={({ isActive }) => getNavClass(isActive)}
      >
        Support
      </NavLink>
    </div>
  </nav>
);

DashboardNav.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
};

PublicNav.propTypes = {
  showDashboard: PropTypes.bool.isRequired,
  pathname: PropTypes.string.isRequired,
};

/**
 * @component Header
 *
 * Global app header (brand + primary desktop navigation + auth area).
 *
 * - Stays sticky at the top for constant navigation context
 * - Shows an auth-check loading state to avoid UI flicker during startup
 * - Renders desktop navigation on lg+ while keeping mobile/tablet compact
 * - Renders either avatar dropdown (authenticated) or login/register links (guest)
 * - Hides login/register buttons on their respective routes to reduce redundancy
 *
 * Notes:
 * - Dashboard route navigation is mirrored here on desktop to avoid empty header space
 *
 * @returns {JSX.Element}
 */
const Header = () => {
  const { user, isLoggingOut, logout, isCheckingAuth } =
    useContext(AuthContext);

  const { pathname } = useLocation();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";
  const isDashboardRoute = isDashboardPath(pathname);
  const showCreatePost =
    Boolean(user) && !isEditorPath(pathname) && !isAuthPath(pathname);
  const createPostLink = showCreatePost ? (
    <NavLink
      to="/dashboard/create"
      className="ui-button-primary hidden whitespace-nowrap px-3 py-2 text-sm lg:inline-flex"
    >
      Create post
    </NavLink>
  ) : null;

  // Avoid rendering guest/auth UI until auth state is resolved (prevents flicker)
  if (isCheckingAuth) {
    return (
      <header className="sticky top-0 z-50 w-full">
        <div className="w-full border-b border-zinc-800 bg-zinc-950">
          <div className="ui-shell-header py-3">
            <div className="flex items-center justify-between gap-3">
              <BrandWordmark className="shrink-0" />
              <div className="h-10 w-10 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  const authBtnBase = "ui-button-outline";
  const mobileAuthTarget = isLogin ? "/register" : "/login";
  const mobileAuthLabel = isLogin ? "Register" : "Login";
  const authLinks = (
    <>
      <NavLink
        to={mobileAuthTarget}
        className={`${authBtnBase} lg:hidden ${
          mobileAuthTarget === "/register"
            ? "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
            : "border-blue-500/40 text-blue-200 hover:bg-blue-500/10"
        }`}
      >
        {mobileAuthLabel}
      </NavLink>

      <span className="hidden items-center gap-2 lg:flex">
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
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="w-full border-b border-zinc-800 bg-zinc-950">
        <div className="ui-shell-header py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
            <BrandWordmark className="shrink-0" />

            {user && isDashboardRoute ? (
              <DashboardNav isAdmin={Boolean(user?.isAdmin)} />
            ) : (
              <PublicNav showDashboard={Boolean(user)} pathname={pathname} />
            )}

            <div className="flex items-center justify-end gap-2 lg:gap-3 xl:gap-4">
              {user ? (
                <>
                  {createPostLink}
                  <AvatarDropdown
                    user={user}
                    logout={logout}
                    isLoggingOut={isLoggingOut}
                  />
                </>
              ) : (
                authLinks
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
