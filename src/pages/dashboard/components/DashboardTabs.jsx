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
  const tabBase =
    "inline-flex items-center gap-2 rounded-lg border border-transparent " +
    "px-2.5 py-1.5 text-xs font-medium text-zinc-400 sm:px-3 lg:text-sm " +
    "hover:bg-zinc-900 hover:text-zinc-100 " +
    FOCUS_RING;

  const tabActive =
    "border-zinc-800 bg-zinc-900 text-zinc-100";

  const badgeBase =
    "inline-flex h-5 min-w-5 items-center justify-center rounded-full " +
    "border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-200";

  return (
    <nav
      aria-label="Dashboard navigation"
      className="-mx-1 overflow-x-auto ui-scrollbar-hidden"
    >
      <div className="flex items-center gap-1 whitespace-nowrap px-1 py-0.5 sm:gap-1.5">
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
    </nav>
  );
};

DashboardTabs.propTypes = {
  trashCount: PropTypes.number,
  isAdmin: PropTypes.bool,
};

export default DashboardTabs;
