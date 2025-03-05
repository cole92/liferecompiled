import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts"; // Dohvatanje postova iz baze
import PostsList from "../components/PostsList"; // Komponenta koja prikazuje postove
import useSearch from "../context/useSearch"; // Importujemo SearchContext

const Home = () => {
  const [posts, setPosts] = useState([]); // Cuva sve postove iz baze
  const { searchTerm, sortBy, selectedCategories } = useSearch(); // Dobijamo globalna stanja iz SearchContext-a

  // Dohvatanje postova iz Firestore-a pri prvom renderovanju
  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts(); // Pozivamo API funkciju za dohvatanje postova
        setPosts(postsData); // Postavljamo postove u state
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchData();
  }, []);

  // Funkcija za filtriranje postova
  const getFilteredPosts = () => {
    let filtered = posts;
    // Filtriramo postove po kategorijama
    if (selectedCategories && selectedCategories.length > 0) {
      filtered = filtered.filter((post) =>
        selectedCategories.includes(post.category)
      );
    }
    // Filtriramo postove po unetoj pretrazi
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((post) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  // Funkcija za sortiranje postova
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
  // Dobijamo konacan niz postova nakon filtriranja i sortiranja
  const finalPosts = getSortedPosts(getFilteredPosts());

  return (
    <div className="mt-4">
      {/* Prosledjujemo konacnu listu postova u komponentu PostsList */}
      <PostsList posts={finalPosts} />
    </div>
  );
};

export default Home;
