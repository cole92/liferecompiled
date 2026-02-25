import PropTypes from "prop-types";
import dayjs from "dayjs";

/**
 * @component CustomTooltip
 *
 * Custom tooltip renderer for Recharts.
 *
 * Behavior:
 * - Formats a month label like "2024-06" into a human label ("June 2024").
 * - Reads the first payload value as the monthly post count.
 * - Highlights the `mostActiveMonth` with an extra message.
 *
 * Data assumptions:
 * - `label` is in "YYYY-MM" format (month bucket key).
 * - `payload[0].value` contains the aggregated count for that bucket.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether Recharts considers the tooltip active.
 * @param {Array} props.payload - Recharts series payload for the hovered point.
 * @param {string} props.label - Month key ("YYYY-MM").
 * @param {string} props.mostActiveMonth - Month key to highlight ("YYYY-MM").
 * @returns {JSX.Element|null}
 */
const CustomTooltip = ({ active, payload, label, mostActiveMonth }) => {
  // Recharts may render tooltip in "inactive" state during transitions.
  if (!active || !payload || !payload.length) return null;

  const rawMonth = label;
  const formatted = dayjs(`${rawMonth}-01`).format("MMMM YYYY");
  const count = payload[0].value;

  return (
    <div className="ui-card p-3 text-sm border border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="font-semibold text-zinc-100">{formatted}</div>

      <div className="mt-1 text-zinc-200">
        {count} post{count > 1 ? "s" : ""}
      </div>

      {label === mostActiveMonth && (
        <div className="mt-2 text-xs font-semibold text-amber-200">
          This was your most active month!
        </div>
      )}
    </div>
  );
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  mostActiveMonth: PropTypes.string,
};

export default CustomTooltip;
