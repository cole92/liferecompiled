import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts";
import PostsList from "../components/PostsList";
import useSearch from "../context/useSearch";
import Spinner from "../components/Spinner";
import NoResultsMessage from "../components/NoResultsMessage";

/**
 * @component Home
 * Prikazuje pocetnu stranicu aplikacije sa listom svih postova.
 *
 * - Dohvata postove iz Firestore baze prilikom montiranja
 * - Primenuje filtraciju po kategorijama i pretrazi iz SearchContext-a
 * - Sortira postove po odabranom kriterijumu (`sortBy`)
 * - Prikazuje `Spinner`, `NoResultsMessage` ili `PostsList` u zavisnosti od stanja
 *
 * @returns {JSX.Element} Lista postova sa primenjenim filterima i sortiranjem
 */
const Home = () => {
  const [posts, setPosts] = useState([]);
  const { searchTerm, sortBy, selectedCategories } = useSearch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts();
        setPosts(postsData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchData();
  }, []);

  const getFilteredPosts = () => {
    let filtered = posts;

    if (selectedCategories && selectedCategories.length > 0) {
      filtered = filtered.filter((post) =>
        selectedCategories.includes(post.category)
      );
    }

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((post) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getSortedPosts = (filteredPosts) => {
    let sortedPosts = [...filteredPosts];

    if (sortBy === "newest") {
      sortedPosts.sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );
    } else if (sortBy === "oldest") {
      sortedPosts.sort(
        (a, b) =>
          a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
      );
    } else if (sortBy === "comments") {
      sortedPosts.sort(
        (a, b) => (b.commentsCount || 0) - (a.commentsCount || 0)
      );
    } else if (sortBy === "likes") {
      sortedPosts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }

    return sortedPosts;
  };

  const finalPosts = getSortedPosts(getFilteredPosts());

  return (
    <div className="mt-4">
      {isLoading ? (
        <Spinner message="" />
      ) : finalPosts.length === 0 ? (
        <NoResultsMessage
          posts={finalPosts}
          searchTerm={searchTerm}
          selectedCategories={selectedCategories}
        />
      ) : (
        <PostsList posts={finalPosts} />
      )}
    </div>
  );
};

export default Home;
