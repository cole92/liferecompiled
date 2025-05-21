import { NavLink } from "react-router-dom";

/**
 * Navigaciona komponenta za Dashboard sekcije.
 *
 * - Prikazuje tabove za `My Posts`, `Saved`, `Stats`, `Trash`
 * - Koristi `NavLink` sa aktivnim stilovima za vizuelni feedback
 *
 * @component
 * @returns {JSX.Element} Horizontalna navigacija unutar Dashboard interfejsa
 */

const DashboardTabs = () => {
  // Tab navigacija za Dashboard sekcije
  return (
    <div className="flex space-x-4 border-b pb-2 mb-4">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          isActive ? "font-bold border-b-2 border-blue-500" : ""
        }
      >
        My Posts
      </NavLink>
      <NavLink
        to="/dashboard/saved"
        className={({ isActive }) =>
          isActive ? "font-bold border-b-2 border-blue-500" : ""
        }
      >
        Saved
      </NavLink>
      <NavLink
        to="/dashboard/stats"
        className={({ isActive }) =>
          isActive ? "font-bold border-b-2 border-blue-500" : ""
        }
      >
        Stats
      </NavLink>
      <NavLink
        to="/dashboard/trash"
        className={({ isActive }) =>
          isActive ? "font-bold border-b-2 border-blue-500" : ""
        }
      >
        Trash
      </NavLink>
    </div>
  );
};

export default DashboardTabs;
