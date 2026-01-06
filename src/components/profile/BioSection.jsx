import PropTypes from "prop-types";

/**
 * @component BioSection
 *
 * Prikazuje biografiju korisnika ili fallback poruku ako bio nije dodat.
 *
 * @param {string} bio – Tekst biografije korisnika
 * @returns {JSX.Element}
 */

const BioSection = ({ bio }) => {
  return (
    <div className="mt-2 text-sm text-zinc-300">
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
  bio: PropTypes.string.isRequired,
};

export default BioSection;
