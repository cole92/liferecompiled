import { useEffect, useState } from "react";
import { getPostsPage } from "../services/homeFeed/getPostsPage";

import PostsList from "../components/PostsList";
import useSearch from "../context/useSearch";
import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import NoResultsMessage from "../components/NoResultsMessage";

const PAGE_SIZE_UI = 16;

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
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const { searchTerm, sortBy, selectedCategories } = useSearch();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pomocni derivati za server:
  // 1) Jedna aktivna kategorija (v1) – ako ih je vise, tretiramo kao "nema filtera"
  const activeCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1
      ? selectedCategories[0]
      : null;

  // 2) Sort za server – v1 podrzava samo newest/oldest

  const serverSort = activeCategory
    ? "newest"
    : sortBy === "oldest"
    ? "oldest"
    : "newest";

  // Fetch PRVE strane na mount + na promenu category/sortBy
  useEffect(() => {
    let isCanceled = false;

    const fetchFirstPage = async () => {
      setIsLoading(true);
      setIsLoadingMore(false);
      setPosts([]);
      setLastDoc(null);
      setHasMore(true);

      try {
        const page = await getPostsPage({
          afterDoc: null,
          pageSize: PAGE_SIZE_UI,
          category: activeCategory,
          sortBy: serverSort,
        });

        if (isCanceled) return;

        setPosts(page.items);
        setLastDoc(page.lastDoc);
        setHasMore(page.hasMore);

        if (page.warnings && page.warnings.length > 0) {
          console.warn("[Home feed warnings]", page.warnings);
        }
      } catch (error) {
        if (!isCanceled) {
          console.error("Error fetching first page:", error);
        }
      } finally {
        if (!isCanceled) {
          setIsLoading(false);
        }
      }
    };

    fetchFirstPage();

    return () => {
      isCanceled = true;
    };
  }, [activeCategory, serverSort]);

  const handleLoadMore = async () => {
    if (isLoading || isLoadingMore || !hasMore || !lastDoc) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const page = await getPostsPage({
        afterDoc: lastDoc,
        pageSize: PAGE_SIZE_UI,
        category: activeCategory,
        sortBy: serverSort,
      });

      // Dedupe po id-u pri append-u

      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const item of page.items) {
          map.set(item.id, item);
        }

        return Array.from(map.values());
      });

      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);

      if (page.warnings && page.warnings.length > 0) {
        console.warn("[Home feed warnings][loadMore]", page.warnings);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Klijentski filter za searchTerm (v1 – samo nad vec ucitanim stranama)
  const getClientFilteredPosts = () => {
    let result = posts;

    if (searchTerm && searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      result = result.filter((post) =>
        post.title.toLowerCase().includes(lower)
      );
    }

    // Sort po datumu je vec uradjen na serveru (newest/oldest),
    // ovde za v1 ne diramo taj poredak.
    return result;
  };

  const finalPosts = getClientFilteredPosts();

  const showNoResults = !isLoading && finalPosts.length === 0;

  return (
    <div className="mt-4">
      {isLoading ? (
        <SkeletonCard />
      ) : showNoResults ? (
        <NoResultsMessage
          posts={finalPosts}
          searchTerm={searchTerm}
          selectedCategories={selectedCategories}
        />
      ) : (
        <>
          <PostsList posts={finalPosts} />

          {/* Mini skeleton pri Load more */}
          {isLoadingMore && (
            <div className="mt-4">
              <SkeletonCard />
            </div>
          )}

          {/* Load more / end helper */}
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore || isLoading || !hasMore}
                aria-busy={isLoadingMore}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : (
            <p
              className="mt-6 text-center text-gray-400 text-sm"
              aria-live="polite"
            >
              You reached the end.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
