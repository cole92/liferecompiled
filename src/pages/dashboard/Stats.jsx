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
import { normalizeMonthlyArray } from "../../utils/statsUtils";

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

        const monthlyArray = normalizeMonthlyArray(data.postsPerMonth || {});

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
      <div className="p-5 text-center text-zinc-100">
        <h2 className="mb-2 text-2xl font-semibold">No data yet</h2>
        <p className="text-zinc-400">
          Once you create posts, your monthly activity will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold">Your Posting Activity</h1>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={postsPerMonth}>
          <XAxis
            dataKey="month"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={{ stroke: "#3f3f46" }}
          />
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

      <h2 className="mb-2 mt-10 text-xl font-semibold">
        Restore vs Delete Ratio
      </h2>

      {isPieEmpty ? (
        <p className="text-sm italic text-zinc-500">
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
            <Legend
              layout="horizontal"
              align="center"
              formatter={(value) => (
                <span className="text-zinc-200">{value}</span>
              )}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default Stats;
