import PropTypes from "prop-types";
import dayjs from "dayjs";

/**
 * @component CustomTooltip
 * Prilagodjeni prikaz za tooltip unutar Recharts grafikona.
 *
 * - Formatira mesec iz `label` vrednosti (npr. "2024-06" → "June 2024")
 * - Prikazuje broj postova za odgovarajući mesec
 *
 * @param {Object} props
 * @param {boolean} props.active - Da li je tooltip trenutno aktivan
 * @param {Array} props.payload - Podaci koje prosleđuje Recharts
 * @param {string} props.label - Labela meseca (npr. "2024-06")
 * @param {string} props.mostActiveMonth - Mesec koji je najaktivniji (npr. "2024-06")
 *
 * @returns {JSX.Element|null} Prikaz tooltips ili `null` ako nije aktivan
 */

const CustomTooltip = ({ active, payload, label, mostActiveMonth }) => {
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
