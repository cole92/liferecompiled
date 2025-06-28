import { useContext, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";

import Spinner from "../../components/Spinner";
import CustomTooltip from "./components/CustomTooltip";

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
  const [mostActiveMonth, setMostActiveMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserStats = async () => {
      setIsLoading(true);

      try {
        const statsRef = doc(db, "userStats", user.uid);
        const statsSnap = await getDoc(statsRef);

        if (!statsSnap.exists()) {
          setPostsPerMonth([]);
          setMostActiveMonth(null);
          setIsLoading(false);
          return;
        }

        const data = statsSnap.data();

        const monthlyArray = Object.entries(data.postsPerMonth || {}).map(
          ([month, count]) => ({
            month,
            count,
          })
        );

        setPostsPerMonth(monthlyArray);

        if (monthlyArray.length === 0) {
          setMostActiveMonth(null);
        } else {
          const mostActive = monthlyArray.reduce((max, curr) =>
            curr.count > max.count ? curr : max
          );
          setMostActiveMonth(mostActive?.month);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setPostsPerMonth([]);
        setMostActiveMonth(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchUserStats();
  }, [user]);

  if (!user || isLoading) {
    return <Spinner message="Loading statistics..." />;
  }

  if (postsPerMonth.length === 0) {
    return (
      <div className="text-white p-5 text-center">
        <h2 className="text-2xl font-semibold mb-2">No data yet</h2>
        <p className="text-gray-300">
          Once you create posts, your monthly activity will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="text-white p-5">
      <h1 className="text-2xl font-semibold mb-4">Your Posting Activity</h1>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={postsPerMonth}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            content={<CustomTooltip mostActiveMonth={mostActiveMonth} />}
          />
          <Bar dataKey="count">
            {postsPerMonth.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.month === mostActiveMonth ? "#FFD700" : "#8884d8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Stats;
