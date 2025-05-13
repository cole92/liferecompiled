import { NavLink } from "react-router-dom";

const DashboardTabs = () => {
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
    </div>
  );
};

export default DashboardTabs;
