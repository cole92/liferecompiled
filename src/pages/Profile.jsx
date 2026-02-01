import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

import { db } from "../firebase";

import ShieldIcon from "../components/ui/ShieldIcon";
import BioSection from "../components/profile/BioSection";
import StatsRow from "../components/profile/StatsRow";
import TopPostCard from "../components/TopPostCard";
import SkeletonGrid from "../components/ui/skeletonLoader/SkeletonGrid";
import {
  SkeletonCircle,
  SkeletonLine,
} from "../components/ui/skeletonLoader/SkeletonBits";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

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

  const isOwnProfile = !!targetUid && !!ownUid && targetUid === ownUid;

  const getPostReactionsTotal = (postData) => {
    const rc = postData?.reactionCounts || {};
    return (rc.idea || 0) + (rc.hot || 0) + (rc.powerup || 0);
  };

  // Fetch user doc
  useEffect(() => {
    let cancelled = false;

    async function fetchUserData() {
      if (!targetUid) {
        if (!cancelled) {
          setUserData(null);
          setLoadingUser(false);
        }
        return;
      }

      if (!cancelled) setLoadingUser(true);

      try {
        const docRef = doc(db, "users", targetUid);
        const docSnap = await getDoc(docRef);

        if (!cancelled) {
          if (docSnap.exists()) {
            setUserData({ ...docSnap.data(), id: docSnap.id });
          } else {
            setUserData(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (!cancelled) setUserData(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  const isTopContributor = useMemo(() => {
    return Boolean(userData?.badges?.topContributor);
  }, [userData]);

  const avatarSrc = useMemo(() => {
    return userData?.profilePicture || DEFAULT_PROFILE_PICTURE;
  }, [userData]);

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
          where("deleted", "==", false),
        );

        const snap = await getCountFromServer(q);

        if (!cancelled) setPostsCount(snap.data().count || 0);
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

  // Total reactions received
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
          where("deleted", "==", false),
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

  // Top 3 posts
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
          where("deleted", "==", false),
        );

        const postSnap = await getDocs(postsQuery);

        const posts = postSnap.docs.map((d) => {
          const data = d.data();
          const reactionsTotal = getPostReactionsTotal(data);
          return { id: d.id, ...data, reactionsCount: reactionsTotal };
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

  if (!loadingUser && !userData) {
    return (
      <div className="w-full px-2 max-[360px]:px-1 sm:px-6 lg:px-10 2xl:px-16 py-6">
        <div className="ui-card p-6 text-center">
          <p className="text-sm text-zinc-300">No user data found.</p>
        </div>
      </div>
    );
  }

  const memberSinceText = userData?.createdAt?.toDate?.()
    ? dayjs(userData.createdAt.toDate()).format("DD MMM YYYY")
    : "---";

  const displayName = userData?.name || "Unknown author";
  const displayEmail = userData?.email || "";

  return (
    <div className="w-full px-2 max-[360px]:px-1 sm:px-6 lg:px-10 2xl:px-16 py-5 sm:py-6">
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* HERO */}
        <section className="ui-card p-3 sm:p-6 lg:p-8">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left: avatar + identity */}
            <div className="lg:col-span-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {loadingUser ? (
                    <SkeletonCircle size={144} />
                  ) : (
                    <img
                      src={avatarSrc}
                      alt="Profile picture"
                      className={[
                        "h-28 w-28 sm:h-36 sm:w-36 rounded-full object-cover border border-zinc-700",
                        isTopContributor
                          ? "ring-2 ring-purple-500/70 ring-offset-2 ring-offset-zinc-950"
                          : "",
                      ].join(" ")}
                      loading="lazy"
                    />
                  )}

                  {!loadingUser && isTopContributor && (
                    <div className="absolute -top-2 -right-2">
                      <ShieldIcon className="h-7 w-7 text-purple-300" />
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  {loadingUser ? (
                    <div className="space-y-2">
                      <SkeletonLine w="w-52" h="h-7" />
                      <SkeletonLine w="w-64" h="h-4" />
                      <SkeletonLine w="w-40" h="h-4" />
                    </div>
                  ) : (
                    <>
                      {/* Name (prevent overflow on long single-word names) */}
                      <h1
                        className="min-w-0 max-w-full truncate text-xl sm:text-2xl font-semibold text-zinc-100"
                        title={displayName}
                      >
                        {displayName}
                      </h1>

                      {/* Pills row */}
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {isOwnProfile ? (
                          <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                            You
                          </span>
                        ) : null}

                        {isTopContributor ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-200"
                            title="Top Contributor"
                          >
                            <ShieldIcon className="h-3.5 w-3.5" />
                            Top Contributor
                          </span>
                        ) : null}
                      </div>

                      {/* Email */}
                      <p
                        className="mt-2 text-sm text-zinc-400 break-all"
                        title={displayEmail}
                      >
                        {displayEmail}
                      </p>

                      {/* Member since */}
                      <p className="mt-2 text-xs text-zinc-500">
                        Member since:{" "}
                        <span className="text-zinc-400">{memberSinceText}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-5">
                <StatsRow
                  variant="cards"
                  posts={postCount}
                  reactions={reactionsCount}
                  loadingPosts={isCounting || postCount == null}
                  loadingReactions={
                    isCountingReactions || reactionsCount == null
                  }
                />
              </div>
            </div>

            {/* Middle: Bio */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3 sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-100">Bio</h2>

                {loadingUser ? (
                  <div className="mt-3 space-y-2">
                    <SkeletonLine w="w-full" h="h-4" />
                    <SkeletonLine w="w-5/6" h="h-4" />
                    <SkeletonLine w="w-2/3" h="h-4" />
                  </div>
                ) : (
                  <BioSection bio={userData?.bio} />
                )}
              </div>
            </div>

            {/* Right: overview */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3 sm:p-5">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Profile overview
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  This section intentionally keeps the hero balanced on large
                  screens. Later we can place badges, links, or additional stats
                  here if you want.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-400">
                    Public profile
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-400">
                    Top posts: {top3?.length || 0}/3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP POSTS */}
        <section className="ui-card p-3 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">
                Top posts
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Most reacted posts by this author (up to 3).
              </p>
            </div>
          </div>

          <div className="mt-6">
            {isLoadingTop3 && <SkeletonGrid count={3} />}

            {errorTop3 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {String(errorTop3)}
              </div>
            )}

            {!isLoadingTop3 && !errorTop3 && top3.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-8 text-center">
                <p className="text-sm text-zinc-400">
                  This author has no public posts yet.
                </p>
              </div>
            )}

            {!isLoadingTop3 && !errorTop3 && top3.length > 0 && (
              <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
                {top3.map((post) => (
                  <div key={post.id} className="h-full">
                    <TopPostCard post={post} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
