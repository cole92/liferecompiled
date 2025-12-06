import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import AccessDenied from "./AccessDenied";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase";

const ModerationPage = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isCheckingAuth || !user.isAdmin) {
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

  if (isCheckingAuth) {
    return <div>Checking permissions...</div>;
  }

  if (!user?.isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Moderation</h1>
      <p className="mt-4">Moderation — coming soon.</p>
    </div>
  );
};

export default ModerationPage;
