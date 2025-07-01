import { useContext, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";

import Spinner from "../../components/Spinner";
import CustomTooltip from "./components/CustomTooltip";

/**
 * @component Stats
 * Komponenta koja prikazuje statistiku aktivnosti korisnika u dashboardu
 *
 * - Dohvata podatke iz userStats kolekcije (Firestore)
 * - Prikazuje broj postova po mesecima putem BarChart
 * - Istice najaktivniji mesec korisnika (mostActiveMonth)
 * - Prikazuje odnos restore vs delete aktivnosti kroz PieChart
 * - Koristi CustomTooltip za prikaz dodatnih informacija
 *
 * @returns JSX sekcija sa prikazom korisnicke aktivnosti
 */

const Stats = () => {
  const { user } = useContext(AuthContext);

  const [postsPerMonth, setPostsPerMonth] = useState([]);
  const [mostActiveMonth, setMostActiveMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pieData, setPieData] = useState([]);
  const [isPieEmpty, setIsPieEmpty] = useState(false);

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

        const restored = data.restoredPosts || 0;
        const deleted = data.permanentlyDeletedPosts || 0;

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

        const pie = [
          { name: "Restored Posts", value: restored },
          { name: "Permanently Deleted", value: deleted },
        ];

        setPieData(pie);
        setIsPieEmpty(pie.every((item) => item.value === 0));
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
      <h2 className="text-xl font-semibold mt-10 mb-2">
        Restore vs Delete Ratio
      </h2>
      {isPieEmpty ? (
        <p className="text-gray-400 italic text-sm">
          No restore or delete activity yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "#00C49F" : "#FF8042"}
                />
              ))}
            </Pie>
            <Legend layout="horizontal" align="center" />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default Stats;
