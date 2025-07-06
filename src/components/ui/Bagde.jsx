import PropTypes from "prop-types";

const Badge = ({ text, color = "blue", icon = null }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded ${colors[color]}`}
    >
      {icon && <span>{icon}</span>}
      {text}
    </span>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  color: PropTypes.oneOf(["blue", "red", "green", "gray"]),
  icon: PropTypes.node,
};

export default Badge;
