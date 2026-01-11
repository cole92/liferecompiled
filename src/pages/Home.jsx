import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import useSearch from "../context/useSearch";

import { getPostsPage } from "../services/homeFeed/getPostsPage";

import PostsList from "../components/PostsList";
import SearchAndFilterBar, {
  FiltersPanelContent,
} from "../components/SearchAndFilterBar";

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
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const {
    setSearchTerm,
    setSortBy,
    setSelectedCategories,
    selectedCategories,
    handleResetFilters,
    sortBy,
  } = useSearch();

  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Desktop sidebar open state (mobile uses drawer, but we keep same state)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const toggleFilters = () => setIsFiltersOpen((prev) => !prev);
  const closeFilters = () => setIsFiltersOpen(false);

  const canShowCreateButton = !!user;

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

  const layoutClass = isFiltersOpen
    ? "grid gap-6 lg:grid-cols-[1fr_320px]"
    : "grid gap-6";

  return (
    <div className="mt-4">
      <div className={layoutClass}>
        {/* Left column: toolbar + list */}
        <div className="flex flex-col gap-3">
          {/* Toolbar card */}
          <div className="ui-card p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <SearchAndFilterBar
                  onSearchChange={setSearchTerm}
                  onSortChange={setSortBy}
                  onFilterChange={setSelectedCategories}
                  onResetFilters={handleResetFilters}
                  selectedCategories={selectedCategories}
                  sortBy={sortBy}
                  showSearch={false}
                  isFiltersOpen={isFiltersOpen}
                  onToggleFilters={toggleFilters}
                  onCloseFilters={closeFilters}
                />
              </div>

              {canShowCreateButton && (
                <button
                  type="button"
                  className="ui-button-primary w-full lg:w-auto whitespace-nowrap"
                  onClick={() => navigate("/dashboard/create")}
                >
                  Create New Post
                </button>
              )}
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            <SkeletonCard />
          ) : showNoResults ? (
            <NoResultsMessage
              posts={finalPosts}
              searchTerm=""
              selectedCategories={selectedCategories}
            />
          ) : (
            <>
              <PostsList posts={finalPosts} showCommentsThread={false} />

              {isLoadingMore && (
                <div className="mt-4">
                  <SkeletonCard />
                </div>
              )}

              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore || isLoading || !hasMore}
                    aria-busy={isLoadingMore}
                    className="ui-button-primary py-2.5"
                  >
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              ) : (
                <p className="ui-help text-center mt-6" aria-live="polite">
                  You reached the end.
                </p>
              )}
            </>
          )}
        </div>

        {/* Right column: desktop sidebar (lg+) */}
        {isFiltersOpen && (
          <aside className="hidden lg:block">
            <div className="ui-card p-4 sticky top-24">
              <FiltersPanelContent
                selectedCategories={selectedCategories}
                onFilterChange={setSelectedCategories}
                onResetFilters={handleResetFilters}
                onClose={closeFilters}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Home;
