import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import Spinner from "../../components/Spinner";
import { db } from "../../firebase";
import { getPostsPerMonth } from "../../utils/statsUtils";

const Stats = () => {
  const { user } = useContext(AuthContext);

  const [postsPerMonth, setPostsPerMonth] = useState([]);

  useEffect(() => {
    if (!user) return <Spinner message="Loading statistics..." />;

    const fetchUserPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapShot = await getDocs(q);

      const posts = snapShot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const monthlyData = getPostsPerMonth(posts);
      setPostsPerMonth(monthlyData);
    };

    fetchUserPosts();
  }, [user]);

  return (
    <div style={{ color: "white", padding: "20px" }}>
      <h1>Statistika sekcija</h1>
      <pre>{JSON.stringify(postsPerMonth, null, 2)}</pre>
    </div>
  );
};

export default Stats;
