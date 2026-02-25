import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";

import { FOCUS_RING } from "../../../constants/uiClasses";

/**
 * @component DashboardTabs
 *
 * Compact dashboard navigation used inside the sticky Dashboard header.
 *
 * Behavior:
 * - Mobile-first: tabs scroll horizontally to avoid wrapping and layout jumps.
 * - Uses `NavLink` active state for clear route feedback.
 * - Shows Trash count badge only when there are deleted posts.
 * - Conditionally renders Moderation tab for admins.
 *
 * @param {Object} props
 * @param {number} [props.trashCount=0] - Live count for deleted posts (trash badge).
 * @param {boolean} [props.isAdmin=false] - Controls whether Moderation tab is visible.
 * @returns {JSX.Element}
 */
const DashboardTabs = ({ trashCount = 0, isAdmin = false }) => {
  // Shared button-like tab styling keeps focus/hover consistent with the app UI kit.
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
    <div className="-mx-1 overflow-x-auto ui-scrollbar">
      <div className="flex items-center gap-2 whitespace-nowrap px-1">
        <NavLink
          to="/dashboard"
          end
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

          {/* Badge only when non-zero to avoid unnecessary visual noise. */}
          {trashCount > 0 && <span className={badgeBase}>{trashCount}</span>}
        </NavLink>

        {/* Admin-only route exposure keeps the default dashboard simpler for regular users. */}
        {isAdmin && (
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
  );
};

DashboardTabs.propTypes = {
  trashCount: PropTypes.number,
  isAdmin: PropTypes.bool,
};

export default DashboardTabs;
