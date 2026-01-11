import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getPostsPage } from "../services/homeFeed/getPostsPage";

import PostsList from "../components/PostsList";
import useSearch from "../context/useSearch";
import SearchAndFilterBar, {
  FiltersPanelContent,
} from "../components/SearchAndFilterBar";
import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import NoResultsMessage from "../components/NoResultsMessage";
import { AuthContext } from "../context/AuthContext";

const PAGE_SIZE_UI = 16;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const { sortBy, selectedCategories, setSortBy, setSelectedCategories, handleResetFilters } =
    useSearch();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Desktop sidebar (lg+ only)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLgUp(mq.matches);
    sync();

    mq.addEventListener?.("change", sync) ?? mq.addListener(sync);
    return () =>
      mq.removeEventListener?.("change", sync) ?? mq.removeListener(sync);
  }, []);

  // If we leave lg viewport, close desktop sidebar to avoid weird states
  useEffect(() => {
    if (!isLgUp) setIsDesktopSidebarOpen(false);
  }, [isLgUp]);

  const canShowCreateButton = !!user;

  const activeCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1
      ? selectedCategories[0]
      : null;

  const serverSort = activeCategory
    ? "newest"
    : sortBy === "oldest"
    ? "oldest"
    : "newest";

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
    if (isLoading || isLoadingMore || !hasMore || !lastDoc) return;

    setIsLoadingMore(true);

    try {
      const page = await getPostsPage({
        afterDoc: lastDoc,
        pageSize: PAGE_SIZE_UI,
        category: activeCategory,
        sortBy: serverSort,
      });

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

  const finalPosts = posts;
  const showNoResults = !isLoading && finalPosts.length === 0;

  const handleToggleDesktopSidebar = () =>
    setIsDesktopSidebarOpen((prev) => !prev);

  const handleCloseDesktopSidebar = () => setIsDesktopSidebarOpen(false);

  const createBtn = canShowCreateButton ? (
    <button
      type="button"
      className="ui-button-primary w-full sm:w-auto"
      onClick={() => navigate("/dashboard/create")}
    >
      Create New Post
    </button>
  ) : null;

  const layoutClass = useMemo(() => {
    if (isLgUp && isDesktopSidebarOpen) {
      return "mt-4 grid gap-6 lg:grid-cols-[1fr_380px]";
    }
    return "mt-4";
  }, [isLgUp, isDesktopSidebarOpen]);

  return (
    <div className="pb-10">
      {/* Subheader / Toolbar (sticky inside main scroll container) */}
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
        {/* Main feed */}
        <div>
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

        {/* Desktop sidebar (lg+ only) */}
        {isLgUp && isDesktopSidebarOpen && (
          <aside className="hidden lg:block">
           <div className="sticky top-28">

              <div className="ui-card p-4">
                <FiltersPanelContent
                  selectedCategories={selectedCategories}
                  onFilterChange={setSelectedCategories}
                  onReset={handleResetFilters}
                  onClose={handleCloseDesktopSidebar}
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
