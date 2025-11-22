import { useEffect, useState } from "react";
import { getPostsPage } from "../services/homeFeed/getPostsPage";

import PostsList from "../components/PostsList";
import useSearch from "../context/useSearch";
import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import NoResultsMessage from "../components/NoResultsMessage";

const PAGE_SIZE_UI = 16;

/**
 * @component Home
 * Landing stranica sa paginiranim Home feed-om.
 *
 * Namena:
 * - Fetch prve stranice postova preko `getPostsPage` (server filter/sort/paginacija)
 * - Uklapa `sortBy` i `selectedCategories` iz SearchContext-a u `serverSort` (v1 pravila)
 * - Prikazuje SkeletonCard, NoResultsMessage ili PostsList + "Load more" u zavisnosti od stanja
 * - U v1 verziji nema klijentskog tekstualnog search-a (search bar je iskljucen)
 *
 * Paginacija:
 * - PAGE_SIZE_UI = 16, cursor-based (lastDoc + hasMore)
 * - Append koristi dedupe po `id` da izbegne duplikate pri "Load more"
 *
 * V1 ogranicenja:
 * - Single category mode: ako je tacno jedna kategorija aktivna, sort se zakljucava na 'newest'
 * - Ako je 0 ili vise od 1 kategorije izabrano → server ne filtrira po kategoriji (activeCategory = null)
 *
 * @returns {JSX.Element}
 */
const Home = () => {
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const { sortBy, selectedCategories } = useSearch();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pomocni derivati za server:
  // 1) Jedna aktivna kategorija (v1) – ako ih je vise, tretiramo kao "nema filtera"
  const activeCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1
      ? selectedCategories[0]
      : null;

  // 2) Sort za server – v1 podrzava samo newest/oldest; pri aktivnoj kategoriji zakljucavamo na "newest"
  const serverSort = activeCategory
    ? "newest"
    : sortBy === "oldest"
    ? "oldest"
    : "newest";

  // Fetch prve strane na mount + na promenu activeCategory/serverSort
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

      // Dedupe po id-u pri append-u (novi pregaze stare)
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

  // Home v1 ne koristi klijentski search; finalPosts je trenutno identican `posts`
  const finalPosts = posts;

  const showNoResults = !isLoading && finalPosts.length === 0;

  return (
    <div className="mt-4">
      {isLoading ? (
        <SkeletonCard />
      ) : showNoResults ? (
        <>
          {/* Home v1 prosledjuje prazan searchTerm jer nema tekstualni search na Home feed-u */}
          <NoResultsMessage
            posts={finalPosts}
            searchTerm=""
            selectedCategories={selectedCategories}
          />
        </>
      ) : (
        <>
          <PostsList posts={finalPosts} showCommentsThread={false} />

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
