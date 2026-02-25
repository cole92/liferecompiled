import PropTypes from "prop-types";

/**
 * @component BioSection
 *
 * Small profile helper that renders the user's bio with safe defaults.
 * - Trims input to avoid showing whitespace-only bios.
 * - Preserves line breaks and handles long unbroken strings via wrap rules.
 * - Shows a friendly placeholder when bio is missing/empty.
 *
 * @param {string=} bio
 * @returns {JSX.Element}
 */
const BioSection = ({ bio }) => {
  const text = typeof bio === "string" ? bio.trim() : "";

  return (
    <div className="mt-2 text-sm leading-relaxed text-zinc-300">
      {text ? (
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>
      ) : (
        <p className="italic text-zinc-500">
          This user hasn&apos;t added a bio yet.
        </p>
      )}
    </div>
  );
};

BioSection.propTypes = {
  bio: PropTypes.string,
};

export default BioSection;
