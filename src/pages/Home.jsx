import { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPostsPage } from "../services/homeFeed/getPostsPage";

import { useSavedIdsForPostIds } from "../hooks/useSavedIdsForPostIds";
import PostCardFeed from "../components/PostCardFeed";
import useSearch from "../context/useSearch";
import SearchAndFilterBar, {
  FiltersPanelContent,
} from "../components/SearchAndFilterBar";
import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import NoResultsMessage from "../components/NoResultsMessage";
import { AuthContext } from "../context/AuthContext";

const PAGE_SIZE_UI = 12;

/**
 * @component Home
 *
 * Home feed page with paginated Firestore-backed listing.
 * - Fetches post pages via `getPostsPage` with cursor-based pagination
 * - Supports server-side sort modes (newest/oldest/trending) and optional category scoping
 * - Tracks saved state for the currently visible posts via `useSavedIdsForPostIds`
 *
 * UX notes:
 * - Uses skeletons for initial load and incremental "Load more"
 * - Provides a docked filters sidebar on md+ as an optional layout mode
 *
 * @returns {JSX.Element}
 */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const {
    sortBy,
    selectedCategories,
    setSortBy,
    setSelectedCategories,
    handleResetFilters,
  } = useSearch();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Docked filters sidebar (md+ only): kept explicit to avoid layout "memory" across breakpoints.
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);

  useEffect(() => {
    // Track viewport breakpoint for docked sidebar behavior without relying on CSS-only state.
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMdUp(mq.matches);
    sync();

    mq.addEventListener?.("change", sync) ?? mq.addListener(sync);
    return () =>
      mq.removeEventListener?.("change", sync) ?? mq.removeListener(sync);
  }, []);

  useEffect(() => {
    // If we leave md viewport, close docked sidebar to avoid weird states on mobile.
    if (!isMdUp) setIsDesktopSidebarOpen(false);
  }, [isMdUp]);

  const canShowCreateButton = !!user;

  const isTrendingSort = sortBy === "trending";

  // Category mode only applies when exactly one category is selected (simple server-side constraint).
  const activeCategory =
    !isTrendingSort &&
    Array.isArray(selectedCategories) &&
    selectedCategories.length === 1
      ? selectedCategories[0]
      : null;

  /**
   * Server sort mode mapping:
   * - "trending" is a dedicated backend path
   * - category + newest is enforced to keep category feed predictable
   * - otherwise respects user selection (newest/oldest)
   */
  const serverSort = isTrendingSort
    ? "trending"
    : activeCategory
      ? "newest"
      : sortBy === "oldest"
        ? "oldest"
        : "newest";

  useEffect(() => {
    let isCanceled = false;

    const fetchFirstPage = async () => {
      // Reset pagination state whenever server query inputs change.
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

        // Non-fatal warnings help detect edge cases (e.g., skipped docs) without breaking UI.
        if (page.warnings && page.warnings.length > 0) {
          console.warn("[Home feed warnings]", page.warnings);
        }
      } catch (error) {
        if (!isCanceled) console.error("Error fetching first page:", error);
      } finally {
        if (!isCanceled) setIsLoading(false);
      }
    };

    fetchFirstPage();

    return () => {
      isCanceled = true;
    };
  }, [activeCategory, serverSort]);

  const handleLoadMore = async () => {
    // Guard: avoid overlapping requests and cursor misuse.
    if (isLoading || isLoadingMore || !hasMore || !lastDoc) return;

    setIsLoadingMore(true);

    try {
      const page = await getPostsPage({
        afterDoc: lastDoc,
        pageSize: PAGE_SIZE_UI,
        category: activeCategory,
        sortBy: serverSort,
      });

      // Merge by id to keep feed stable if backend returns overlaps or updated items.
      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const item of page.items) map.set(item.id, item);
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

  // Single place to apply any future client-side transforms.
  const finalPosts = posts;

  // Saved-state hook expects post ids; memo avoids useless recalcs on renders.
  const postIds = useMemo(() => finalPosts.map((p) => p.id), [finalPosts]);

  const { savedIds, setSavedIds } = useSavedIdsForPostIds(user?.uid, postIds);

  const handleSavedChange = useCallback(
    (postId, nextState) => {
      // Local optimistic update so the UI responds immediately to save/unsave toggles.
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (nextState) next.add(postId);
        else next.delete(postId);
        return next;
      });
    },
    [setSavedIds],
  );

  const showNoResults = !isLoading && finalPosts.length === 0;

  const handleToggleDesktopSidebar = () =>
    setIsDesktopSidebarOpen((prev) => !prev);

  const handleCloseDesktopSidebar = () => setIsDesktopSidebarOpen(false);

  const createBtn = canShowCreateButton ? (
    <>
      {/* Mobile: icon-only to keep header compact. */}
      <button
        type="button"
        className="ui-button-primary inline-flex h-11 w-11 items-center justify-center p-0 sm:hidden"
        aria-label="Create new post"
        onClick={() => navigate("/dashboard/create")}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Desktop: explicit CTA label. */}
      <button
        type="button"
        className="hidden sm:inline-flex ui-button-primary"
        onClick={() => navigate("/dashboard/create")}
      >
        Create New Post
      </button>
    </>
  ) : null;

  /**
   * Layout switches:
   * - Default: single column feed
   * - md+ + docked sidebar: 2-col grid with fixed sidebar width
   */
  const layoutClass = useMemo(() => {
    if (isMdUp && isDesktopSidebarOpen) {
      return "mt-4 grid gap-4 lg:gap-6 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_380px]";
    }
    return "mt-4";
  }, [isMdUp, isDesktopSidebarOpen]);

  // Posts grid adjusts column count based on whether sidebar is docked.
  const feedGridClassName = isDesktopSidebarOpen
    ? "grid grid-cols-1 gap-5 sm:gap-6 items-stretch xl:grid-cols-2"
    : "grid grid-cols-1 gap-5 sm:gap-6 items-stretch lg:grid-cols-2";

  return (
    <div className="pb-2">
      <div className="sticky top-16 z-40">
        <div className="w-full border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
          <div className="ui-shell py-3">
            <SearchAndFilterBar
              onSearchChange={() => {}}
              onSortChange={setSortBy}
              onFilterChange={setSelectedCategories}
              onResetFilters={handleResetFilters}
              selectedCategories={selectedCategories}
              sortBy={sortBy}
              showSearch={false}
              variant="bare"
              afterSortSlot={createBtn}
              desktopSidebarOpen={isDesktopSidebarOpen}
              onDesktopToggleFilters={handleToggleDesktopSidebar}
              onDesktopCloseFilters={handleCloseDesktopSidebar}
            />
          </div>
        </div>
      </div>

      <div className={layoutClass}>
        <div>
          {isLoading ? (
            <SkeletonCard />
          ) : showNoResults ? (
            isTrendingSort ? (
              <p className="ui-help text-center mt-6" aria-live="polite">
                No trending posts right now.
              </p>
            ) : (
              <NoResultsMessage
                posts={finalPosts}
                searchTerm=""
                selectedCategories={selectedCategories}
              />
            )
          ) : (
            <>
              <div className={feedGridClassName}>
                {finalPosts.map((post) => (
                  <PostCardFeed
                    key={post.id}
                    post={post}
                    isSaved={savedIds.has(post.id)}
                    onSavedChange={handleSavedChange}
                  />
                ))}
              </div>

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

        {/* Docked sidebar (md+ only) */}
        {isMdUp && isDesktopSidebarOpen && (
          <aside className="hidden md:block">
            <div className="sticky top-28">
              <div className="ui-card p-4 h-[calc(100vh-8rem)] max-h-[760px] overflow-hidden">
                <FiltersPanelContent
                  selectedCategories={selectedCategories}
                  onFilterChange={setSelectedCategories}
                  onReset={handleResetFilters}
                  onClose={handleCloseDesktopSidebar}
                  isTrending={isTrendingSort}
                />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Home;
