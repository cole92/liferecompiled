import { useContext, useEffect, useState } from "react";
import { doc, getDoc, getDocs } from "firebase/firestore";

import { AuthContext } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { buildSavedQuery } from "../../../../services/savedPostsService";

import { enrichPostWithAuthor } from "../../../../services/userService";
import { showErrorToast } from "../../../../utils/toastUtils";

import SavedPostCard from "./SavedPostCard";
import EmptyState from "../EmptyState";
import SkeletonCard from "../../../../components/ui/skeletonLoader/SkeletonCard";

/**
 * @component SavedPosts
 *
 * Lista sacuvanih postova korisnika.
 *
 * - Cita users/{uid}/savedPosts sa paginacijom (startAfter + limit)
 * - Za svaku referencu pokusava da ucita posts/{id}
 * - Promise.allSettled omogucava da se "lose" stavke preskoce (privatno/obrisano)
 * - Renderuje samo validne rezultate i drzi UX stabilnim (Skeleton, end-of-list)
 *
 * @returns {JSX.Element}
 */
const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Paginacija
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;

  useEffect(() => {
    let canceled = false;

    // Ne pokrecemo fetch dok auth provera ne zavrsi; gosti ne citaju
    if (isCheckingAuth) return;
    if (!user) return;

    // Reset state-a pri promeni user-a (ili kada se vrati sa drugih stranica)
    setSavedPosts([]);
    setLastDoc(null);
    setHasMore(true);
    setIsLoadingMore(false);

    const fetchSavedPosts = async () => {
      setIsLoading(true);
      try {
        const q = buildSavedQuery({ uid: user.uid, pageSize: POST_PER_PAGE });
        const savedSnap = await getDocs(q);
        if (canceled) return;

        if (savedSnap.empty) {
          setSavedPosts([]);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        // Kursor i indikator ima li jos podataka
        setLastDoc(savedSnap.docs[savedSnap.docs.length - 1]);
        setHasMore(savedSnap.size === POST_PER_PAGE);

        // Promise.allSettled: degraduje "lose" stavke umesto da padne ceo batch
        const results = await Promise.allSettled(
          savedSnap.docs.map(async (docItem) => {
            // Referenca: doc id == postId
            const postRef = doc(db, "posts", docItem.id);
            const postSnap = await getDoc(postRef);

            // Ako post ne postoji → tretiramo kao nevalidnu referencu
            if (!postSnap.exists()) {
              throw new Error("missing-post");
            }

            const postData = { id: postSnap.id, ...postSnap.data() };

            // Enrich autora (ako ovde pukne, bice "rejected" i preskace se)
            return await enrichPostWithAuthor(postData);
          })
        );

        // Uzimamo samo uspesne rezultate
        const posts = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        if (canceled) return;
        setSavedPosts(posts);
      } catch (error) {
        // Top-level greska (mreza i sl.); per-item permission-denied ne dolazi ovde
        console.error("Error fetching saved posts (top-level):", error);
        if (!canceled) showErrorToast("Something went wrong.");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchSavedPosts();

    return () => {
      canceled = true; // cleanup da spreci setState posle unmount-a
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isCheckingAuth]);

  // Dovlaci sledecu stranicu referenci i enrich-uje validne postove
  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const q = buildSavedQuery({
        uid: user.uid,
        afterDoc: lastDoc,
        pageSize: POST_PER_PAGE,
      });

      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        return;
      }

      // Kursor i hasMore
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.size === POST_PER_PAGE);

      // Ponovo koristimo allSettled da preskocimo nevalidne reference
      const results = await Promise.allSettled(
        snap.docs.map(async (docItem) => {
          const postRef = doc(db, "posts", docItem.id);
          const postSnap = await getDoc(postRef);
          if (!postSnap.exists()) throw new Error("missing-post");
          const postData = { id: postSnap.id, ...postSnap.data() };
          return await enrichPostWithAuthor(postData);
        })
      );

      const posts = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      // Merge bez duplikata (novi pregaze stare po id-u)
      setSavedPosts((prev) => {
        const merged = [...prev, ...posts];
        const byId = new Map(merged.map((p) => [p.id, p]));
        return Array.from(byId.values());
      });
    } catch (e) {
      showErrorToast("Failed to load more saved posts.");
      console.error("Error loading more posts:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Loading state
  if (isCheckingAuth || isLoading) {
    return <SkeletonCard />;
  }

  // Guest gate
  if (!user) {
    return <p>Please log in to view saved posts.</p>;
  }

  // Empty state
  if (savedPosts.length === 0) {
    return <EmptyState message="You haven't saved any posts yet." />;
  }

  // Lista sacuvanih postova + paginacija
  return (
    <div>
      <h1>Saved Posts</h1>

      {savedPosts.map((post) => (
        <div key={post.id}>
          <SavedPostCard post={post} />
        </div>
      ))}

      {/* Loading more */}
      {isLoadingMore && <SkeletonCard />}

      {/* Load more / end-of-list */}
      {!isLoading && hasMore && (
        <button onClick={handleLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      {!isLoading && !hasMore && (
        <p className="mt-4 text-sm text-gray-500 text-center">
          You reached the end.
        </p>
      )}
    </div>
  );
};

export default SavedPosts;
