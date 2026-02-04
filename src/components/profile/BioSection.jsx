import PropTypes from "prop-types";

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
