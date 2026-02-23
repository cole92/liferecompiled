import PropTypes from "prop-types";
import mostInspiringSmallBadge from "./badges/small/mini_inspiring.webp";
import toHotSmallBagde from "./badges/small/mini_hot.webp";

const badgeImages = {
  "Most Inspiring": mostInspiringSmallBadge,
  Trending: toHotSmallBagde,
};

const Badge = ({ text, onClick, locked, size = 26 }) => {
  const imgSrc = badgeImages[text];
  const canClick = !!onClick && !locked;

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={[
        // mini glass chip frame
        "inline-flex items-center justify-center",
        "rounded-full border border-zinc-800/70 bg-zinc-950/55 backdrop-blur",
        "ring-1 ring-zinc-100/5 shadow-sm",
        // spacing
        "p-1",
        // states
        canClick
          ? "cursor-pointer hover:bg-zinc-900/45 transition"
          : "cursor-default",
        locked ? "grayscale opacity-75" : "opacity-95 hover:opacity-100",
        // a11y
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      ].join(" ")}
      aria-label={text}
      title={text}
    >
      <img
        src={imgSrc}
        alt=""
        width={size}
        height={size}
        className={canClick ? "transition-transform hover:scale-105" : ""}
        draggable={false}
      />
    </button>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  locked: PropTypes.bool,
  size: PropTypes.number,
};

export default Badge;
