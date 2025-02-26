import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts"; // Import funkcije
import PostsList from "../components/PostsList";
import { validCategories } from "../constants/postCategories";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts(); // Pozivamo funkciju za dohvatanje postova
        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchData(); // Pozivamo funkciju kada se komponenta mount-uje
  }, []);

  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target; // Dobijamo vrednost (naziv kategorije) i stanje (true ili false)

    if (checked) {
      // Ako je selektovano, dodaj u listu
      setSelectedCategories((prev) => [...prev, value]);
    } else {
      // Ako nije selektovano, ukloni iz liste
      setSelectedCategories((prev) =>
        prev.filter((category) => category !== value)
      );
    }
  };

  const handleApplyFilters = () => {
    if (selectedCategories.length === 0) {
      setFilteredPosts(posts); // Ako nema filtera, prikazujemo sve postove
    } else {
      const filtered = posts.filter(
        (post) => selectedCategories.includes(post.category) // OVO MORA DA VRATI TRUE/FALSE
      );

      setFilteredPosts(filtered); // Ažuriramo state sa filtriranim postovima
    }
  };

  const handleResetFilters = () => {
    setSelectedCategories([]); // Resetujemo odabrane kategorije
    setFilteredPosts(posts); // Vracamo sve postove
  };

  return (
    <div>
      <div className="p-4">
        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0 ">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search posts..."
            value={undefined}
            onChange={undefined}
            className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Sort Dropdown */}
          <select
            value={undefined}
            onChange={undefined}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="comments">Most Comments</option>
            <option value="likes">Most Likes</option>
          </select>
          {/* Filter Button */}
          <button
            onClick={toggleFilterPanel} // Kasnije dodajemo funkcionalnost
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filters
          </button>
        </div>
        {isFilterOpen && (
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4 transition-transform duration-300">
            <h2 className="text-lg font-bold">Filter Options</h2>
            {/* Kategorije */}
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
                    onChange={handleCategoryChange}
                  />
                  <span>{categoryItem}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleApplyFilters}
              className="mt-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="mt-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Reset
            </button>

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
        {/* Lista postova (placeholder) */}
        <div className="mt-4">
          {/* Ovde cemo kasnije prikazivati filtrirane postove */}
          <h2 className="text-xl font-bold">
            {" "}
            <PostsList
              posts={filteredPosts.length > 0 ? filteredPosts : posts}
            />
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Home;
