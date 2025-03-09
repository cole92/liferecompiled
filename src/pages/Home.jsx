import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts"; // Dohvatanje postova iz baze
import PostsList from "../components/PostsList"; // Komponenta koja prikazuje postove
import useSearch from "../context/useSearch"; // Importujemo SearchContext
import Spinner from "../components/Spinner";
import NoResultsMessage from "../components/NoResultsMessage";

const Home = () => {
  const [posts, setPosts] = useState([]); // Cuva sve postove iz baze
  const { searchTerm, sortBy, selectedCategories } = useSearch(); // Dobijamo globalna stanja iz SearchContext-a
  const [isLoading, setIsLoading] = useState(true);

  // Dohvatanje postova iz Firestore-a pri prvom renderovanju
  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts(); // Pozivamo API funkciju za dohvatanje postova
        setPosts(postsData); // Postavljamo postove u state
        setIsLoading(false) // Postavljamo loader na false (Podaci ucitani)
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
      {/* Proveravamo da li se podaci ucitavaju */}
      {isLoading ? (
        <Spinner message=""/>
      ) : finalPosts.length === 0 ? (
        /* Ako su podaci ucitani, ali nema postova, prikazujemo poruku */
        <NoResultsMessage
          posts={finalPosts}
          searchTerm={searchTerm}
          selectedCategories={selectedCategories}
        />
      ) : (
        /* Ako su postovi ucitani i postoje, prikazujemo ih */
        <PostsList posts={finalPosts} />
      )}
    </div>
  );
};

export default Home;
