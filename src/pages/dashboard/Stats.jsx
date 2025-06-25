import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import Spinner from "../../components/Spinner";
import { db } from "../../firebase";
import { getPostsPerMonth } from "../../utils/statsUtils";
import CustomTooltip from "./components/CustomTooltip";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/**
 * @component Stats
 * Komponenta koja prikazuje statistiku broja postova po mesecima za trenutno ulogovanog korisnika.
 *
 * - Dohvata sve korisnikove postove iz Firestore-a
 * - Koristi helper `getPostsPerMonth` za agregaciju podataka po mesecima
 * - Prikazuje rezultate kroz `Recharts` bar chart
 *
 * @returns {JSX.Element} Sekcija sa statistickim prikazom
 */

const Stats = () => {
  const { user } = useContext(AuthContext);

  const [postsPerMonth, setPostsPerMonth] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ucitava sve postove trenutnog korisnika i izracunava broj postova po mesecima
    const fetchUserPosts = async () => {
      setIsLoading(true);
      const q = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapShot = await getDocs(q);
      // Pretvara dokumente iz baze u niz objekata sa id-jem
      const posts = snapShot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const monthlyData = getPostsPerMonth(posts);
      setPostsPerMonth(monthlyData);
      setIsLoading(false);
    };

    fetchUserPosts();
  }, [user]);

  // Prikaz loading spinnera dok se podaci ucitavaju
  if (!user || isLoading) {
    return <Spinner message="Loading statistics..." />;
  }

  return (
    <div style={{ color: "white", padding: "20px" }}>
      <h1>Statistika sekcija</h1>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={postsPerMonth}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Stats;
