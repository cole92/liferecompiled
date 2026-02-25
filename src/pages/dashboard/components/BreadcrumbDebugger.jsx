import { useLocation } from "react-router-dom";

/**
 * @component BreadcrumbDebugger
 *
 * Dev-only helper that logs the current route path.
 * Useful while building breadcrumb / nested route layouts.
 *
 * NOTE:
 * - Renders nothing (returns null).
 * - Should not be included in production UI unless explicitly needed.
 *
 * @returns {null}
 */
const BreadcrumbDebugger = () => {
  const location = useLocation();

  // Debug breadcrumb routing context (e.g. "/dashboard/saved").
  console.log("📍 Current path:", location.pathname);

  return null;
};

export default BreadcrumbDebugger;
