import PropTypes from "prop-types";

const BioSection = ({ bio }) => {
  return (
    <div className="mt-2 text-sm leading-relaxed text-zinc-300">
      {bio ? (
        <p className="whitespace-pre-wrap break-words">{bio}</p>
      ) : (
        <p className="italic text-zinc-500">
          This user hasn`t added a bio yet.
        </p>
      )}
    </div>
  );
};

BioSection.propTypes = {
  bio: PropTypes.string,
};

export default BioSection;
