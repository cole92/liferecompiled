import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import ShieldIcon from "../components/ui/ShieldIcon";
import BioSection from "../components/profile/BioSection";
import StatsRow from "../components/profile/StatsRow";
import { useParams } from "react-router-dom";
import TopPostCard from "../components/TopPostCard";
import SkeletonGrid from "../components/ui/skeletonLoader/SkeletonGrid";
import dayjs from "dayjs";
import {
  SkeletonCircle,
  SkeletonLine,
} from "../components/ui/skeletonLoader/SkeletonBits";

/**
 * @component Profile
 *
 * Public ili own profil korisnika uz metrike:
 * - Users doc: ime, email, status, createdAt, bio, profilePicture, badges
 * - Posts count: count aktivnih postova (deleted == false)
 * - Reactions received: sabiranje iz posts.reactionCounts (authoritative backend)
 * - Top 3 posts: sortiranje po ukupnim reakcijama iz posts.reactionCounts
 */
const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [postCount, setPostsCount] = useState(null);
  const [isCounting, setIsCounting] = useState(false);

  const [reactionsCount, setReactionsCount] = useState(null);
  const [isCountingReactions, setIsCountingReactions] = useState(false);

  const [isLoadingTop3, setIsLoadingTop3] = useState(false);
  const [top3, setTop3] = useState([]);
  const [errorTop3, setErrorTop3] = useState(null);

  const auth = getAuth();
  const ownUid = auth.currentUser?.uid || null;

  const { uid } = useParams();
  const targetUid = uid || ownUid;

  const getPostReactionsTotal = (postData) => {
    const rc = postData?.reactionCounts || {};
    return (rc.idea || 0) + (rc.hot || 0) + (rc.powerup || 0);
  };

  // Fetch user doc
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", targetUid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData({ ...docSnap.data(), id: docSnap.id });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [targetUid]);

  // Count active posts
  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      if (!targetUid) {
        if (!cancelled) {
          setPostsCount(0);
          setIsCounting(false);
        }
        return;
      }

      setIsCounting(true);

      try {
        const postsCol = collection(db, "posts");
        const q = query(
          postsCol,
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );

        const snap = await getCountFromServer(q);

        if (!cancelled) {
          setPostsCount(snap.data().count || 0);
        }
      } catch (err) {
        console.error("Count failed", err);
        if (!cancelled) setPostsCount(0);
      } finally {
        if (!cancelled) setIsCounting(false);
      }
    }

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  // Total reactions received (from posts.reactionCounts)
  useEffect(() => {
    let cancelled = false;

    async function fetchReactionsReceived() {
      if (!targetUid) {
        if (!cancelled) {
          setReactionsCount(0);
          setIsCountingReactions(false);
        }
        return;
      }

      setIsCountingReactions(true);

      try {
        const postQ = query(
          collection(db, "posts"),
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );

        const postSnap = await getDocs(postQ);

        const total = postSnap.docs.reduce((sum, d) => {
          return sum + getPostReactionsTotal(d.data());
        }, 0);

        if (!cancelled) setReactionsCount(total);
      } catch (err) {
        console.error("Reactions count failed", err);
        if (!cancelled) setReactionsCount(0);
      } finally {
        if (!cancelled) setIsCountingReactions(false);
      }
    }

    fetchReactionsReceived();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  // Top 3 posts (by total reactions from posts.reactionCounts)
  useEffect(() => {
    let cancelled = false;

    async function fetchTop3() {
      if (!targetUid) {
        if (!cancelled) {
          setTop3([]);
          setIsLoadingTop3(false);
        }
        return;
      }

      setIsLoadingTop3(true);
      setErrorTop3(null);

      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );

        const postSnap = await getDocs(postsQuery);

        const posts = postSnap.docs.map((d) => {
          const data = d.data();
          const reactionsTotal = getPostReactionsTotal(data);

          return {
            id: d.id,
            ...data,
            reactionsCount: reactionsTotal,
          };
        });

        posts.sort((a, b) => (b.reactionsCount || 0) - (a.reactionsCount || 0));

        if (!cancelled) setTop3(posts.slice(0, 3));
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorTop3(err?.message ?? "Top3 failed");
      } finally {
        if (!cancelled) setIsLoadingTop3(false);
      }
    }

    fetchTop3();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  if (!loading && !userData) return <p>No user data found!</p>;

  const isTopContributor = !!userData?.badges?.topContributor;

  return (
    <div className="mb-4 text-center">
      {/* HEADER: avatar + badge */}
      <div className="relative inline-block">
        {loading ? (
          <SkeletonCircle size={150} />
        ) : (
          <img
            src={userData.profilePicture}
            alt="Profile pic"
            className={`rounded-full object-cover border-2 border-zinc-700 ${
              isTopContributor ? "ring-2 ring-purple-600" : ""
            }`}
            style={{ width: "150px", height: "150px" }}
          />
        )}

        {!loading && isTopContributor && (
          <>
            <ShieldIcon className="absolute -top-2 -right-2 h-6 w-6 text-purple-400" />
            <p
              className="mt-2 cursor-default select-none text-sm font-semibold italic text-purple-400"
              title="Top Contributor"
            >
              .code-powered
            </p>
          </>
        )}
      </div>

      {/* BASIC INFO */}
      <div className="mb-4 mt-4 flex flex-col gap-4 md:flex-row md:items-start">
        <div className="w-full text-center md:w-1/2 md:text-left">
          {loading ? (
            <>
              <div className="mt-2">
                <SkeletonLine w="w-48" h="h-6" />
              </div>
              <div className="mt-2">
                <SkeletonLine w="w-56" h="h-4" />
              </div>
            </>
          ) : (
            <>
              <h4 className="text-lg font-semibold text-zinc-100">
                {userData.name}
              </h4>
              <p className="break-all text-sm text-zinc-400">
                {userData.email}
              </p>
            </>
          )}
        </div>

        <div className="w-full text-center md:w-1/2 md:text-right">
          {loading ? (
            <>
              <div className="mt-2">
                <SkeletonLine w="w-64" h="h-4" />
              </div>
              <div className="mt-2">
                <SkeletonLine w="w-32" h="h-4" />
              </div>
            </>
          ) : (
            <>
              <p className="cursor-default select-none text-sm italic text-zinc-400">
                Member since:{" "}
                {userData.createdAt
                  ? dayjs(userData.createdAt.toDate()).format("DD MMMM 'YYYY")
                  : "---"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* BIO */}
      <div className="text-center">
        <h5 className="cursor-default select-none text-sm font-medium text-zinc-200">
          Bio:
        </h5>
        {loading ? (
          <div className="mx-auto mt-2 max-w-xl space-y-2">
            <SkeletonLine w="w-full" h="h-4" />
            <SkeletonLine w="w-5/6" h="h-4" />
            <SkeletonLine w="w-2/3" h="h-4" />
          </div>
        ) : (
          <BioSection bio={userData.bio} />
        )}
      </div>

      {/* STATS */}
      <StatsRow
        posts={postCount}
        reactions={reactionsCount}
        loadingPosts={isCounting || postCount == null}
        loadingReactions={isCountingReactions || reactionsCount == null}
      />

      {/* TOP 3 */}
      <div>
        <h2 className="mb-4 cursor-default select-none text-xl font-semibold text-zinc-100">
          Top posts by this author
        </h2>

        {isLoadingTop3 && <SkeletonGrid count={3} />}
        {errorTop3 && <p className="text-red-500">{String(errorTop3)}</p>}
        {!isLoadingTop3 && !errorTop3 && top3.length === 0 && (
          <p className="text-sm text-zinc-400">
            This author has no public posts yet.
          </p>
        )}
        {!isLoadingTop3 && !errorTop3 && top3.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {top3.map((post) => (
              <TopPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
