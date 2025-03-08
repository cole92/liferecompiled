import PropTypes from "prop-types";

const NoResultsMessage = ({ posts, searchTerm, selectedCategories }) => {
  // Ako uopste nema postova u bazi
  // Ovo se desava samo ako baza nema nijedan post (nova aplikacija ili su svi obrisani)
  if (
    !posts ||
    (Array.isArray(posts) &&
      posts.length === 0 &&
      searchTerm === "" &&
      selectedCategories.length === 0)
  ) {
    return (
      <p className="no-posts-message">
        There are no posts yet. Be the first to create one!
      </p>
    );
  }

  // Ako korisnik koristi i pretragu i filtere, ali nista ne pronalazi
  // Ova situacija se desava kada unese kljucnu rec u pretragu i selektuje filtere,
  // ali nijedan post ne odgovara tim kriterijumima
  if (
    searchTerm.trim() !== "" &&
    selectedCategories.length > 0 &&
    posts.length === 0
  ) {
    return (
      <p className="no-posts-message">
        No results for this search and filters. Try something else!
      </p>
    );
  }

  // Ako postoji pretraga, ali nema rezultata
  // Ovo se desava kada korisnik unese kljucnu rec u pretragu, ali nijedan post ne sadrzi tu rec
  if (searchTerm.trim() !== "" && posts.length === 0) {
    return (
      <p className="no-posts-message">
        No search results. Try a different keyword.
      </p>
    );
  }

  // Ako su filteri aktivni, ali nema rezultata
  // Desava se kada korisnik izabere filtere, ali nijedan post ne pripada tim kategorijama
  if (selectedCategories.length > 0 && posts.length === 0) {
    return (
      <p className="no-posts-message">
        There are no posts in the selected categories. Maybe you want to expand
        the filters?
      </p>
    );
  }

  return null; // Ako nijedan od uslova nije ispunjen, ne prikazujemo nista (fallback)
};
// PropTypes validacija - Osiguravamo da props-i imaju tacne tipove
NoResultsMessage.propTypes = {
  posts: PropTypes.array.isRequired, // `posts` mora biti niz i obavezan je
  searchTerm: PropTypes.string, // `searchTerm` je string (moze biti prazan)
  selectedCategories: PropTypes.arrayOf(PropTypes.string), // `selectedCategories` je niz stringova
};

export default NoResultsMessage;
