import { useNavigate } from "react-router-dom";

/**
 * @component AccessDenied
 *
 * Simple guard-screen for admin-only routes.
 *
 * Behavior:
 * - Renders a short explanation and a single escape hatch back to `/dashboard`.
 * - Keeps logic minimal so route guards can stay consistent elsewhere (no auth checks here).
 *
 * @returns {JSX.Element}
 */
const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-semibold mb-4">Access denied</h2>
      <p className="mb-6">Only admins can view this page.</p>
      <button
        onClick={() => navigate("/dashboard")}
        className="px-4 py-2 bg-blue-600 text-zinc-50 rounded"
      >
        Back to dashboard
      </button>
    </div>
  );
};

export default AccessDenied;
