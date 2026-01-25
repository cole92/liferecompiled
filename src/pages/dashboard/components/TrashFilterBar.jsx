import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * TrashFilterBar
 * - Base..md: horizontal scroll (no wrap)
 * - LG+: normal wrap / no scroll
 * - Scroll indicator: moving thumb (no fade), active while scroll is used
 */
const TrashFilterBar = ({ filterRange, onFilterChange }) => {
  const scrollerRef = useRef(null);

  const [thumb, setThumb] = useState({
    visible: false,
    widthPct: 0,
    leftPct: 0,
  });

  const filters = useMemo(
    () => [
      {
        label: "0-10 days",
        value: "0-10",
        className:
          "border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
      },
      {
        label: "11-20 days",
        value: "11-20",
        className:
          "border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
      },
      {
        label: "21-30 days",
        value: "21-30",
        className:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
      },
    ],
    [],
  );

  const baseBtn =
    "inline-flex items-center rounded-full border whitespace-nowrap transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  const btnSize = "px-3 py-1 text-sm";

  const updateThumb = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 1) {
      setThumb({ visible: false, widthPct: 0, leftPct: 0 });
      return;
    }

    const widthPct = (clientWidth / scrollWidth) * 100;
    const leftPct = (scrollLeft / maxScroll) * (100 - widthPct);

    setThumb({
      visible: true,
      widthPct,
      leftPct,
    });
  };

  useEffect(() => {
    updateThumb();

    const el = scrollerRef.current;
    if (!el) return;

    const onResize = () => updateThumb();

    el.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", onResize);
    };
  }, [filters.length]);

  return (
    <div className="relative lg:static">
      <div
        ref={scrollerRef}
        className={
          "flex items-center gap-2 " +
          "flex-nowrap overflow-x-auto " +
          "-mx-2 px-2 pt-1 pb-2 " +
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden " +
          "lg:overflow-visible lg:flex-wrap lg:mx-0 lg:px-0 lg:py-0"
        }
      >
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={
              `${baseBtn} ${btnSize} ${f.className} ` +
              `${filterRange === f.value ? "ring-1 ring-zinc-100/40" : ""} ` +
              "lg:hover:scale-105"
            }
          >
            {f.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className={
            `${baseBtn} ${btnSize} border-zinc-800 bg-zinc-950/40 text-zinc-200 ` +
            "hover:bg-zinc-900/40 " +
            `${!filterRange ? "ring-1 ring-zinc-100/40" : ""} ` +
            "lg:hover:scale-105"
          }
        >
          Reset
        </button>
      </div>

      {/* Moving underline indicator while scroll is active */}
      {thumb.visible && (
        <div className="pointer-events-none lg:hidden">
          <div className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-zinc-800/70 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 rounded-full bg-zinc-500/70"
              style={{
                width: `${thumb.widthPct}%`,
                left: `${thumb.leftPct}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

TrashFilterBar.propTypes = {
  filterRange: PropTypes.string,
  onFilterChange: PropTypes.func.isRequired,
};

export default TrashFilterBar;
