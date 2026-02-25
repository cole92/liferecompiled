import { useLocation } from "react-router-dom";

/**
 * @component DashboardBreadcrumb
 *
 * Minimal breadcrumb label for dashboard routes (sm+ only).
 *
 * Why:
 * - Desktop users benefit from lightweight location context.
 * - Mobile keeps UI clean by hiding breadcrumbs entirely.
 *
 * Behavior:
 * - Maps known dashboard paths to a simple label string.
 * - Falls back to "Dashboard" for unknown/extended routes.
 *
 * @returns {JSX.Element}
 */
const DashboardBreadcrumb = () => {
  const { pathname } = useLocation();

  // Central mapping keeps breadcrumb strings consistent across dashboard pages.
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
