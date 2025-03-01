import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts"; // Import funkcije za dohvatanje postova
import PostsList from "../components/PostsList"; // Komponenta za prikaz liste postova
import { validCategories } from "../constants/postCategories"; // Import predefinisanih kategorija

const Home = () => {
  // State za upravljanje podacima
  const [posts, setPosts] = useState([]); // State za postove (svi postovi)
  const [filteredPosts, setFilteredPosts] = useState([]); // Postovi filtrirani po kategorijama
  const [searchTerm, setSearchTerm] = useState(""); // Pretraga postova po naslovu
  const [sortBy, setSortBy] = useState("newest"); // Sortiranje postova ("newest" ili "oldest")
  const [selectedCategories, setSelectedCategories] = useState([]); // Selekcija kategorija za filter
  const [isFilterOpen, setIsFilterOpen] = useState(false); // State za otvaranje/zatvaranje filter panela

  // Dohvatanje postova iz Firestore baze podataka
  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts(); // Poziv funkcije za dohvatanje podataka iz Firestore-a
        setPosts(postsData); // Postavljamo sve postove u state
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchData(); // Poziv funkcije pri prvom renderu komponente
  }, []);

  // Funkcija za otvaranje/zatvaranje filter panela
  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Funkcija za pracenje promene checkbox filtera (kategorije)
  const handleCategoryChange = (event) => {
    const { value, checked } = event.target; // Dobijamo naziv kategorije i da li je selektovana

    if (checked) {
      // Ako je selektovano, dodaj u listu
      setSelectedCategories((prev) => {
        const newCategories = [...prev, value];
        applyFilters(newCategories); // Azuriranje filtriranih postova u realnom vremenu
        return newCategories;
      });
    } else {
      // Ako nije selektovano, ukloni iz liste
      setSelectedCategories((prev) => {
        const newCategories = prev.filter((category) => category !== value);
        applyFilters(newCategories); // Ponovo filtriramo sa novim podacima
        return newCategories;
      });
    }
  };

  // Funkcija za filtriranje postova na osnovu selektovanih kategorija
  const applyFilters = (categories) => {
    if (categories.length === 0) {
      setFilteredPosts(posts); // Ako nema filtera, prikazujemo sve postove
    } else {
      const filtered = posts.filter(
        (post) => categories.includes(post.category) // Prikazujemo samo postove koji pripadaju izabranim kategorijama
      );
      setFilteredPosts(filtered); // Azuriramo filtrirane postove
    }
  };

  // Funkcija za primenu pretrage nad filtriranim postovima
  const getFilteredPosts = () => {
    let filtered = filteredPosts.length > 0 ? filteredPosts : posts;
    // Ako korisnik unosi nesto u pretragu, filtriramo po naslovu
    if (searchTerm) {
      filtered = filtered.filter((post) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  // Funkcija za sortiranje postova po datumu kreiranja
  const getSortedPosts = (filtered) => {
    return [...filtered].sort((a, b) =>
      sortBy === "newest"
        ? b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        : a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
    );
  };
  
  // Resetovanje filtera i vracanje na pocetno stanje
  const handleResetFilters = () => {
    setSelectedCategories([]); // Resetuje filtere
    setFilteredPosts(posts); // Vraca sve postove
    setSortBy("newest"); // Resetuje sortiranje
  };

  return (
    <div>
      <div className="p-4">
        {/* Filter Bar - sadrzi pretragu, sortiranje i dugme za otvaranje filtera */}
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0 ">
          {/* Search Input - polje za pretragu po naslovima */}
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Sort Dropdown - biranje nacina sortiranja */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="comments">Most Comments</option>
            <option value="likes">Most Likes</option>
          </select>
          {/* Filter Button - dugme za otvaranje filter panela */}
          <button
            onClick={toggleFilterPanel}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filters
          </button>
        </div>
        {/* 📌 Filter Panel (otvara se sa strane) */}
        {isFilterOpen && (
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4 transition-transform duration-300">
            <h2 className="text-lg font-bold">Filter Options</h2>
            {/* Kategorije - checkbox opcije */}
            <h3 className="text-md font-semibold mt-4">Categories</h3>
            <div className="mt-2">
              {validCategories.map((categoryItem) => (
                <label
                  key={categoryItem}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    value={categoryItem}
                    checked={selectedCategories.includes(categoryItem)}
                    onChange={handleCategoryChange}
                  />
                  <span>{categoryItem}</span>
                </label>
              ))}
            </div>
            {/* Reset Button - resetuje filtere */}
            <button
              onClick={handleResetFilters}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Reset
            </button>
            {/* Close Button - zatvara filter panel */}
            <div>
              <button
                onClick={toggleFilterPanel}
                className="mt-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Lista postova - prikaz postova nakon filtera, pretrage i sortiranja */}
        <div className="mt-4">
          <h2 className="text-xl font-bold">
            {" "}
            <PostsList posts={getSortedPosts(getFilteredPosts())} />
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Home;
