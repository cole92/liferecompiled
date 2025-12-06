import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import AccessDenied from "./AccessDenied";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { showErrorToast } from "../../../utils/toastUtils";

const ModerationPage = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isCheckingAuth || !user?.isAdmin) {
      return;
    }

    const fetchReports = async () => {
      try {
        setIsLoadingReports(true);
        setError(null);

        const q = query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          limit(100)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(data);
      } catch (err) {
        console.error("Failed to load reports:", err);
        setError("Failed to load reports. Please try again.");
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [user, isCheckingAuth]);

  const handleOpenTarget = async (report) => {
  // 1) Post prijava -> direkt na /post/:postId
  if (report.type === "post") {
    navigate(`/post/${report.targetId}`);
    return;
  }

  // 2) Comment prijava -> nadji parent post
  if (report.type === "comment") {
    try {
      const commentRef = doc(db, "comments", report.targetId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        showErrorToast("Comment no longer exists.");
        return;
      }

      const commentData = commentSnap.data();
      const postId = commentData.postID; // polje iz Firestore-a (postID)

      if (!postId) {
        console.error("Comment document has no postID field:", report.targetId);
        showErrorToast("Could not find parent post for this comment.");
        return;
      }

      navigate(`/post/${postId}`);
    } catch (error) {
      console.error("Failed to open target for comment:", error);
      showErrorToast("Failed to open comment target. Please try again.");
    }
  }
};

  if (isCheckingAuth) {
    return <div>Checking permissions...</div>;
  }

  if (!user?.isAdmin) {
    return <AccessDenied />;
  }

  if (isLoadingReports) {
    return <div>Loading reports...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (reports.length === 0) {
    return <div>No reports yet. 🎉</div>;
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
