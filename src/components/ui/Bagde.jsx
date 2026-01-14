import PropTypes from "prop-types";
import mostInspiringSmallBadge from "./badges/small/mini_inspiring.webp";
import toHotSmallBagde from "./badges/small/mini_hot.webp";

const badgeImages = {
  "Most Inspiring": mostInspiringSmallBadge,
  Trending: toHotSmallBagde,
};

const Badge = ({ text, onClick, locked, size = 36 }) => {
  const imgSrc = badgeImages[text];

  const canClick = !!onClick && !locked;

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={[
        "inline-flex items-center justify-center rounded-md",
        canClick ? "cursor-pointer" : "cursor-default",
        locked ? "grayscale opacity-80" : "opacity-95 hover:opacity-100",
        canClick ? "transition" : "",
      ].join(" ")}
      aria-label={text}
      title={text}
    >
      <img
        src={imgSrc}
        alt={text}
        style={{ width: size, height: size }}
        className={canClick ? "transition-transform hover:scale-105" : ""}
      />
    </button>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  locked: PropTypes.bool,
  size: PropTypes.number, // px
};

export default Badge;
