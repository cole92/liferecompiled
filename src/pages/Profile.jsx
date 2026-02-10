import { useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import ShieldIcon from "../components/ui/ShieldIcon";
import BioSection from "../components/profile/BioSection";
import StatsRow from "../components/profile/StatsRow";
import TopPostCard from "../components/TopPostCard";
import SkeletonGrid from "../components/ui/skeletonLoader/SkeletonGrid";
import {
  SkeletonCircle,
  SkeletonLine,
} from "../components/ui/skeletonLoader/SkeletonBits";

import Avatar from "../components/common/Avatar";
import BadgeModal from "../components/modals/BadgeModal";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { FOCUS_RING } from "../constants/uiClasses";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [postCount, setPostsCount] = useState(null);
  const [isCounting, setIsCounting] = useState(false);

  const [reactionsCount, setReactionsCount] = useState(null);
  const [isCountingReactions, setIsCountingReactions] = useState(false);

  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

  const [isLoadingTop3, setIsLoadingTop3] = useState(false);
  const [top3, setTop3] = useState([]);
  const [errorTop3, setErrorTop3] = useState(null);

  const { user: authUser } = useContext(AuthContext);
  const ownUid = authUser?.uid || null;

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

  const engagement =
    postCount && postCount > 0 && reactionsCount != null
      ? Math.round((reactionsCount / postCount) * 10) / 10
      : 0;

  return (
    <div className="w-full px-2 max-[360px]:px-1 sm:px-6 lg:px-10 2xl:px-16 py-5 sm:py-6">
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* HERO */}
        <section className="ui-card relative overflow-hidden p-3 sm:p-6 lg:p-8">
          {/* subtle glow like feed */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(100%_70%_at_90%_10%,rgba(34,197,94,0.08),transparent_55%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
          </div>

          <div className="relative grid gap-5 sm:gap-6 2xl:grid-cols-12 2xl:items-start">
            {/* Left: avatar + identity + stats */}
            <div className="2xl:col-span-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {loadingUser ? (
                    <SkeletonCircle size={144} />
                  ) : (
                    <>
                      {/* xs */}
                      <div className="sm:hidden">
                        <Avatar
                          src={avatarSrc}
                          size={112}
                          zoomable
                          badge={isTopContributor}
                          alt="Profile picture"
                        />
                      </div>

                      {/* sm+ */}
                      <div className="hidden sm:block">
                        <Avatar
                          src={avatarSrc}
                          size={144}
                          zoomable
                          badge={isTopContributor}
                          alt="Profile picture"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Identity */}
                <div
                  className={[
                    "min-w-0 flex-1 text-center",
                    // sm+ avatar is left (row), but identity is centered due to empty space
                    "sm:flex sm:flex-col sm:items-center sm:text-center",
                    // 2xl: back to left, since it becomes a true column layout
                    "2xl:items-start 2xl:text-left",
                  ].join(" ")}
                >
                  {loadingUser ? (
                    <div className="space-y-2">
                      <SkeletonLine w="w-52" h="h-7" />
                      <SkeletonLine w="w-64" h="h-4" />
                      <SkeletonLine w="w-40" h="h-4" />
                    </div>
                  ) : (
                    <>
                      <h1
                        className={[
                          "min-w-0 max-w-full text-xl sm:text-2xl font-semibold text-zinc-100",
                          "[overflow-wrap:anywhere] line-clamp-2",
                          "sm:line-clamp-none sm:truncate sm:[overflow-wrap:normal]",
                        ].join(" ")}
                        title={displayName}
                      >
                        {displayName}
                      </h1>

                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-center 2xl:justify-start">
                        {isOwnProfile ? (
                          <span className="rounded-full border border-zinc-800/90 bg-zinc-950/40 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                            You
                          </span>
                        ) : null}

                        {isTopContributor ? (
                          <button
                            type="button"
                            onClick={() => setShowTopContributorModal(true)}
                            className={`inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/15 transition ${FOCUS_RING}`}
                            title="Top Contributor"
                            aria-label="Open Top Contributor badge info"
                          >
                            <ShieldIcon className="h-3.5 w-3.5" />
                            Top Contributor
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-800/90 bg-zinc-950/30 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
                            title="Community member"
                          >
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            Member
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-2 text-sm text-zinc-400 [overflow-wrap:anywhere]"
                        title={displayEmail}
                      >
                        {displayEmail}
                      </p>

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

            {/* Bio */}
            <div className="2xl:col-span-5">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/20 p-3 sm:p-5">
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

            {/* Highlights */}
            <div className="2xl:col-span-3">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/20 p-3 sm:p-5">
                {/* Title row + (mobile/tablet) chip on the right */}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Highlights
                  </h3>

                  <span className="2xl:hidden rounded-full border border-zinc-800 bg-zinc-950/30 px-2.5 py-1 text-[11px] text-zinc-400">
                    Public profile
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>Visibility</span>
                    <span className="text-zinc-200">Public</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Top posts</span>
                    <span className="text-zinc-200">{top3?.length || 0}/3</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Engagement</span>
                    <span className="text-zinc-200">{engagement} / post</span>
                  </div>
                </div>

                {/* Desktop (2xl) footer chip centered */}
                <div className="mt-4 hidden 2xl:flex justify-center">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2.5 py-1 text-[11px] text-zinc-400">
                    Public profile
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Contributor badge modal (same as feed pattern) */}
        {showTopContributorModal && isTopContributor && (
          <BadgeModal
            isOpen={showTopContributorModal}
            locked={false}
            authorBadge="topContributor"
            onClose={() => setShowTopContributorModal(false)}
          />
        )}

        {/* TOP POSTS */}
        <section className="ui-card relative overflow-hidden p-3 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/15 to-transparent" />
          </div>

          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">
                Top posts
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Most reacted posts by this author (up to 3).
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            {isLoadingTop3 && <SkeletonGrid count={3} />}

            {errorTop3 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {String(errorTop3)}
              </div>
            )}

            {!isLoadingTop3 && !errorTop3 && top3.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/20 p-8 text-center">
                <p className="text-sm text-zinc-400">
                  This author has no public posts yet.
                </p>
              </div>
            )}

            {!isLoadingTop3 && !errorTop3 && top3.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-3 lg:auto-rows-fr">
                {top3.map((post) => (
                  <TopPostCard key={post.id} post={post} />
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
