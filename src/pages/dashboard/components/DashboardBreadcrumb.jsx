import { useLocation } from "react-router-dom";

const DashboardBreadcrumb = () => {
  const location = useLocation();
  const { pathname } = location;

  const pathMap = {
    "/dashboard": "Dashboard",
    "/dashboard/saved": "Dashboard / Saved Posts",
    "/dashboard/stats": "Dashboard / Statistics",
    "/dashboard/moderation": "Dashboard / Moderation",
  };

  const label = pathMap[pathname] || "Dashboard";

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-zinc-400 mb-4">
      <span>{label}</span>
    </nav>
  );
};

export default DashboardBreadcrumb;
