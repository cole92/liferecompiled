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
    <div className="text-sm text-gray-700 dark:text-gray-700 mt-2">
      {bio ? (
        <p className="whitespace-pre-wrap">{bio}</p>
      ) : (
        <p className="italic text-gray-400">
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
