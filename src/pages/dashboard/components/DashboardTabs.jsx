import { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import { AuthContext } from "../../../context/AuthContext";
import { FOCUS_RING } from "../../../constants/uiClasses";

/**
 * DashboardTabs
 *
 * Compact dashboard navigation (mobile-first).
 * - Tabs scroll horizontally on small screens.
 * - Create action on the right (mobile icon, md+ text button).
 */
const DashboardTabs = ({ trashCount = 0 }) => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();

  const isMyPostsPage = pathname === "/dashboard";

  const tabBase =
    "inline-flex items-center gap-2 rounded-xl " +
    "px-2.5 py-1 text-[13px] sm:px-3 sm:py-1.5 sm:text-sm font-medium " +
    "border border-transparent text-zinc-300 hover:text-zinc-100 hover:bg-zinc-950/40 " +
    "transition " +
    FOCUS_RING;

  const tabActive =
    "bg-zinc-950/60 text-zinc-100 border-zinc-800 shadow-sm ring-1 ring-zinc-100/5";

  const badgeBase =
    "inline-flex items-center justify-center h-5 min-w-5 rounded-full " +
    "border border-zinc-700 bg-zinc-100/10 px-1.5 text-[11px] text-zinc-200";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="-mx-1 flex-1 overflow-x-auto ui-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap px-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${tabBase} ${isActive ? tabActive : ""}`
            }
          >
            My Posts
          </NavLink>

          <NavLink
            to="/dashboard/saved"
            className={({ isActive }) =>
              `${tabBase} ${isActive ? tabActive : ""}`
            }
          >
            Saved
          </NavLink>

          <NavLink
            to="/dashboard/stats"
            className={({ isActive }) =>
              `${tabBase} ${isActive ? tabActive : ""}`
            }
          >
            Stats
          </NavLink>

          <NavLink
            to="/dashboard/trash"
            className={({ isActive }) =>
              `${tabBase} ${isActive ? tabActive : ""}`
            }
          >
            <span>Trash</span>
            {trashCount > 0 && <span className={badgeBase}>{trashCount}</span>}
          </NavLink>

          {user?.isAdmin && (
            <NavLink
              to="/dashboard/moderation"
              className={({ isActive }) =>
                `${tabBase} ${isActive ? tabActive : ""}`
              }
            >
              Moderation
            </NavLink>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user?.email ? (
          <span className="hidden md:block text-xs text-zinc-400 max-w-[220px] truncate">
            {user.email}
          </span>
        ) : null}

        {isMyPostsPage && (
          <>
            <NavLink
              to="/dashboard/create"
              aria-label="Create new post"
              title="Create new post"
              className={`md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-zinc-50 hover:bg-sky-400 transition ${FOCUS_RING}`}
            >
              <span className="text-xl leading-none">+</span>
            </NavLink>

            <NavLink
              to="/dashboard/create"
              className="hidden md:inline-flex ui-button-primary"
            >
              Create post
            </NavLink>
          </>
        )}
      </div>
    </div>
  );
};

DashboardTabs.propTypes = {
  trashCount: PropTypes.number,
};

export default DashboardTabs;
