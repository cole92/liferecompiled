import { useContext, useEffect, useMemo, useState } from "react";
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
} from "recharts";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { normalizeMonthlyArray } from "../../utils/statsUtils";

import Spinner from "../../components/Spinner";
import CustomTooltip from "./components/CustomTooltip";

/**
 * @component Stats
 *
 * Dashboard analytics view built on `userStats/{uid}`.
 * - Renders a monthly posts bar chart and highlights the most active month.
 * - Renders a restore vs delete pie chart (Trash actions).
 *
 * Notes:
 * - Uses a `chartsReady` gate to avoid Recharts measuring before layout is stable
 *   (prevents width/height -1 warnings on first paint).
 * - Treats missing stats doc as "no data yet" without throwing.
 *
 * @returns {JSX.Element}
 */

/**
 * Hook: breakpoint helper for "lg" (min-width: 1024px).
 * Uses `matchMedia` so charts can adjust tick angles / sizes responsively.
 */
const useIsLg = () => {
  const [isLg, setIsLg] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsLg(e.matches);

    // Support older browsers that still use `addListener`.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isLg;
};

/**
 * Tick formatter for YYYY-MM keys.
 * Keeps the axis compact while preserving a stable ordering from Firestore data.
 */
const monthTick = (v) => {
  const m = v?.slice(5, 7);
  const map = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };
  return map[m] ?? v;
};

const Stats = () => {
  const { user } = useContext(AuthContext);

  const [postsPerMonth, setPostsPerMonth] = useState([]);
  const [mostActiveMonth, setMostActiveMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [pieData, setPieData] = useState([]);
  const [isPieEmpty, setIsPieEmpty] = useState(false);

  // Avoid recharts measuring before layout is stable (prevents width/height -1 warnings).
  const [chartsReady, setChartsReady] = useState(false);

  const isLg = useIsLg();

  useEffect(() => {
    // Defer chart mount to the next frame so containers have measurable dimensions.
    let raf = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      setIsLoading(true);

      try {
        const statsRef = doc(db, "userStats", user.uid);
        const statsSnap = await getDoc(statsRef);

        // Missing doc is treated as a clean "no data" state.
        if (!statsSnap.exists()) {
          setPostsPerMonth([]);
          setMostActiveMonth(null);
          setPieData([]);
          setIsPieEmpty(true);
          return;
        }

        const data = statsSnap.data();

        // Keep charts tolerant to partial documents / missing counters.
        const restored = data.restoredPosts || 0;
        const deleted = data.permanentlyDeletedPosts || 0;

        // Normalize into a stable array so the chart renders in chronological order.
        const monthlyArray = normalizeMonthlyArray(data.postsPerMonth || {});
        setPostsPerMonth(monthlyArray);

        // Derive highlight month purely from chart data to avoid mismatch.
        if (monthlyArray.length === 0) {
          setMostActiveMonth(null);
        } else {
          const mostActive = monthlyArray.reduce((max, curr) =>
            curr.count > max.count ? curr : max,
          );
          setMostActiveMonth(mostActive?.month || null);
        }

        const pie = [
          { name: "Restored", value: restored },
          { name: "Deleted", value: deleted },
        ];

        setPieData(pie);
        setIsPieEmpty(pie.every((item) => item.value === 0));
      } catch (error) {
        console.error("Error fetching stats:", error);

        // On error, fall back to empty states rather than rendering broken charts.
        setPostsPerMonth([]);
        setMostActiveMonth(null);
        setPieData([]);
        setIsPieEmpty(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Guard: do not fetch until we have a user context.
    if (user) fetchUserStats();
  }, [user]);

  const wrapperClass = "space-y-6 py-2 text-zinc-100";
  const cardClass =
    "ui-card rounded-2xl border border-zinc-800/70 bg-zinc-950/40 " +
    "ring-1 ring-zinc-100/5 shadow-sm overflow-hidden p-4 sm:p-5";

  const pieTooltipProps = useMemo(
    () => ({
      // Inline tooltip styling avoids global CSS and keeps chart portable.
      contentStyle: {
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        border: "1px solid rgba(63, 63, 70, 0.8)",
        borderRadius: 12,
        padding: "8px 10px",
      },
      labelStyle: { color: "rgb(228, 228, 231)" },
      itemStyle: { color: "rgb(228, 228, 231)" },
    }),
    [],
  );

  // Loading + auth guard: keep the dashboard consistent with other pages.
  if (!user || isLoading) {
    return <Spinner message="Loading statistics..." />;
  }

  // If there is no monthly data, show a friendly empty state instead of a blank chart.
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

  const restoredValue = pieData?.[0]?.value ?? 0;
  const deletedValue = pieData?.[1]?.value ?? 0;

  return (
    <section className={wrapperClass}>
      <div className={cardClass}>
        <h1 className="text-xl sm:text-2xl font-semibold">
          Your Posting Activity
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monthly posts + restore/delete ratio.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Bar chart */}
        <div className={cardClass}>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Posts per month</h2>
            <p className="text-sm text-zinc-400">
              Highlighted: most active month.
            </p>
          </div>

          <div className="h-[270px] lg:h-[240px] min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={postsPerMonth}
                  margin={{
                    top: 6,
                    right: 10,
                    left: 0,
                    bottom: isLg ? 8 : 22,
                  }}
                >
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthTick}
                    interval={0}
                    minTickGap={8}
                    tickMargin={8}
                    height={isLg ? 26 : 42}
                    angle={isLg ? 0 : -35}
                    textAnchor={isLg ? "middle" : "end"}
                    tick={{ fill: "#a1a1aa", fontSize: isLg ? 12 : 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={isLg ? 42 : 30}
                    tickMargin={6}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip mostActiveMonth={mostActiveMonth} />
                    }
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {/* Highlight is based on derived `mostActiveMonth`, not index. */}
                    {postsPerMonth.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.month === mostActiveMonth
                            ? "#facc15"
                            : "#38bdf8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // Placeholder keeps height reserved until charts mount.
              <div className="h-full w-full" />
            )}
          </div>

          <div className="mt-2 text-sm text-zinc-400">
            Most active:{" "}
            <span className="text-zinc-100 font-medium">
              {mostActiveMonth || "—"}
            </span>
          </div>
        </div>

        {/* Pie chart */}
        <div className={cardClass}>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Restore vs Delete ratio</h2>
            <p className="text-sm text-zinc-400">
              Based on your Trash actions.
            </p>
          </div>

          {isPieEmpty ? (
            <p className="text-sm italic text-zinc-500">
              No restore or delete activity yet.
            </p>
          ) : (
            <>
              <div className="h-[260px] lg:h-[260px] min-w-0">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={isLg ? 92 : 84}
                        dataKey="value"
                        stroke="rgba(255,255,255,0.10)"
                      >
                        {/* Fixed colors keep meaning consistent: green=restored, rose=deleted. */}
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? "#34d399" : "#fb7185"}
                          />
                        ))}
                      </Pie>
                      <Tooltip {...pieTooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  // Placeholder keeps layout stable until charts mount.
                  <div className="h-full w-full" />
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Restored
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {restoredValue}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    Deleted
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {deletedValue}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Stats;
