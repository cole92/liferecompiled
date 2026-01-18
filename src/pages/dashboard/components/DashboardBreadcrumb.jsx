import { useLocation } from "react-router-dom";

/**
 * DashboardBreadcrumb
 *
 * Minimal breadcrumb label for md+ screens only.
 * Keeps UI clean on mobile.
 */
const DashboardBreadcrumb = () => {
  const { pathname } = useLocation();

  const pathMap = {
    "/dashboard": "Dashboard",
    "/dashboard/saved": "Dashboard / Saved",
    "/dashboard/stats": "Dashboard / Stats",
    "/dashboard/trash": "Dashboard / Trash",
    "/dashboard/moderation": "Dashboard / Moderation",
  };

  const label = pathMap[pathname] || "Dashboard";

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden sm:block text-xs text-zinc-500"
    >
      <span>{label}</span>
    </nav>
  );
};

export default DashboardBreadcrumb;
