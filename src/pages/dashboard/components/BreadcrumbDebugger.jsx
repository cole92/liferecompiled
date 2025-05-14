import { useLocation } from "react-router-dom"

const BreadcrumbDebugger = () => {
  const location = useLocation();
  console.log("📍 Current path:", location.pathname); // /dashboard/saved
  return null;
};

export default BreadcrumbDebugger;
