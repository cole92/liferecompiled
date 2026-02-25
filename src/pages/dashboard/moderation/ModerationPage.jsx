import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import AccessDenied from "./AccessDenied";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase";
import { showErrorToast } from "../../../utils/toastUtils";
import SkeletonCard from "../../../components/ui/skeletonLoader/SkeletonCard";
import { openReportTarget } from "../../../utils/moderationUtils";

/**
 * @component ModerationPage
 *
 * Admin-only moderation dashboard for viewing recent user reports.
 *
 * Data behavior:
 * - Loads up to 100 most recent docs from `reports`, ordered by `createdAt desc`.
 * - Access is gated by `user.isAdmin` (UI guard); Firestore rules should enforce this too.
 *
 * UX behavior:
 * - Shows lightweight permission state while auth is being checked.
 * - Uses skeleton cards during initial reports fetch.
 * - On fetch failure, shows a single toast + inline error (no repeated stacking).
 *
 * @returns {JSX.Element}
 */
const ModerationPage = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Guard: only fetch after auth check completes and user is admin.
    if (isCheckingAuth || !user?.isAdmin) {
      return;
    }

    const fetchReports = async () => {
      try {
        setIsLoadingReports(true);
        setError(null);

        // Simple capped list to keep moderation UI fast and predictable.
        const q = query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          limit(100),
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setReports(data);
      } catch (err) {
        console.error("Failed to load reports:", err);

        // Keep user feedback actionable; toastId de-dupes if the effect retriggers.
        setError("Failed to load reports. Please try again.");
        showErrorToast("Failed to load reports. Please try again.");
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [user, isCheckingAuth]);

  const handleOpenTarget = (report) => {
    // Centralized navigation logic keeps target routing consistent for different report types.
    openReportTarget({ report, navigate });
  };

  if (isCheckingAuth) {
    return <div>Checking permissions...</div>;
  }

  if (!user?.isAdmin) {
    return <AccessDenied />;
  }

  if (isLoadingReports) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Moderation</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Moderation</h1>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Moderation</h1>
        <div>No reports yet. 🎉</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Moderation</h1>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-2">Created at</th>
            <th className="py-2 px-2">Type</th>
            <th className="py-2 px-2">Target ID</th>
            <th className="py-2 px-2">Reported by</th>
            <th className="py-2 px-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-b">
              <td className="py-2 px-2">
                {report.createdAt?.toDate
                  ? report.createdAt.toDate().toLocaleString()
                  : "-"}
              </td>
              <td className="py-2 px-2">{report.type}</td>
              <td className="py-2 px-2">{report.targetId}</td>
              <td className="py-2 px-2">{report.reportedBy}</td>
              <td className="py-2 px-2">
                <button
                  type="button"
                  onClick={() => handleOpenTarget(report)}
                  className="text-blue-600 underline"
                >
                  Open target
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModerationPage;
