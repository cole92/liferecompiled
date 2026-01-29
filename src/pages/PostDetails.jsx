import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock, FiMessageCircle } from "react-icons/fi";

import { AuthContext } from "../context/AuthContext";

import { httpsCallable } from "firebase/functions";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { functions, db } from "../firebase";

import { getUserById } from "../services/userService";
import { submitReport } from "../services/reportService";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";
import { normalizePostDoc } from "../mappers/posts/normalizePostDoc";

import AuthorLink from "../components/AuthorLink";
import ReactionSummary from "../components/reactions/ReactionSummary";
import Comments from "../components/comments/Comments";
import CommentsSheet from "../components/comments/CommentsSheet";
import Spinner from "../components/Spinner";
import ShieldIcon from "../components/ui/ShieldIcon";
import ConfirmModal from "../components/modals/ConfirmModal";
import BadgeModal from "../components/modals/BadgeModal";
import Badge from "../components/ui/Bagde";
import Avatar from "../components/common/Avatar";

import { toggleSavePost } from "../utils/savedPostUtils";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/toastUtils";

const useMediaQuery = (q) => {
  const getMatch = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(q).matches
      : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(q);

    const onChange = (e) => setMatches(e.matches);

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    setMatches(mql.matches);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [q]);

  return matches;
};

const PostDetails = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [author, setAuthor] = useState(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const { user } = useContext(AuthContext);
  const currentUserId = user?.uid ?? null;
  const postAuthorId = post?.userId ?? null;
  const isAdmin = user?.isAdmin === true;

  const isAuthor =
    currentUserId && postAuthorId && currentUserId === postAuthorId;
  const canManagePost = isAuthor || isAdmin;

  const lockedDate = post?.lockedAt?.toDate?.()?.toLocaleDateString?.() ?? null;

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post && post.id);

  const isLgUp = useMediaQuery("(min-width: 1024px)");

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  useEffect(() => {
    if (isLgUp) setIsCommentsOpen(false);
  }, [isLgUp]);

  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!postId) return;

    const qRef = query(
      collection(db, "comments"),
      where("postID", "==", postId),
      orderBy("timestamp", "desc"),
    );

    const unsub = onSnapshot(qRef, (snapshot) => {
      const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(results);
    });

    return unsub;
  }, [postId]);

  const commentsCount = useMemo(() => {
    return comments.reduce((acc, c) => (c?.deleted ? acc : acc + 1), 0);
  }, [comments]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;

    const postRef = doc(db, "posts", postId);

    const unsub = onSnapshot(
      postRef,
      (snap) => {
        if (cancelled) return;

        if (!snap.exists()) {
          setPost(null);
          setIsLoading(false);
          return;
        }

        const postData = normalizePostDoc(snap);
        if (!postData) {
          setPost(null);
          setIsLoading(false);
          return;
        }

        setPost(postData);
        setIsLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("PostDetails onSnapshot error:", error);
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [postId]);

  useEffect(() => {
    if (!post?.userId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getUserById(post.userId);
        if (!cancelled) setAuthor(data);
      } catch (e) {
        console.error("Error fetching author:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post?.userId]);

  if (isLoading) return <Spinner />;
  if (!post) return <p>Post not found.</p>;

  const handleSaveToggle = async (e) => {
    e.stopPropagation();

    const currentUpdated = post.updatedAt || post.createdAt;

    const snapshot = {
      postUpdatedAtAtSave: currentUpdated,
      postTitleAtSave: post.title,
    };

    const newState = await toggleSavePost(user, post.id, isSaved, snapshot);
    setIsSaved(newState);
  };

  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  const onReportClick = () => {
    if (!user) {
      showInfoToast("Please login to report 😊");
      return;
    }
    setShowReportModal(true);
  };

  const onConfirmReport = async () => {
    if (!user) {
      showInfoToast("Please login to report 😊");
      setShowReportModal(false);
      return;
    }
    if (currentUserId && postAuthorId && currentUserId === postAuthorId) {
      showInfoToast("You can't report your own post.");
      return;
    }

    try {
      await submitReport({
        type: "post",
        targetId: postId,
        reportedBy: currentUserId,
      });
      showSuccessToast("Post reported. Thank you!");
    } catch (error) {
      showErrorToast("Report failed. Try again.");
      console.log(error);
    } finally {
      setShowReportModal(false);
    }
  };

  const handleAdminHardDelete = async () => {
    if (!isAdmin || isDeletingPost) return;

    try {
      setIsDeletingPost(true);
      const deletePost = httpsCallable(functions, "deletePostCascade");
      await deletePost({ postId });
      showSuccessToast("Post permanently deleted.");
      setDeleteModalOpen(false);
      navigate("/dashboard/moderation");
    } catch (error) {
      console.error("Delete error:", error);
      showErrorToast("Failed to delete post.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const wrapperClass = "w-full max-w-7xl mx-auto my-6 sm:my-8 pb-24 lg:pb-0";
  const gridClass =
    "grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start";

  const cardBase =
    "ui-card rounded-2xl border border-zinc-800/70 bg-zinc-950/40 ring-1 ring-zinc-100/5 shadow-sm";

  const postCardClass = [
    cardBase,
    "overflow-hidden p-4 sm:p-6",
    "lg:h-[calc(100vh-9rem)] lg:flex lg:flex-col",
    post.badges?.trending ? "ring-2 ring-rose-500/60 border-rose-500/40" : "",
    post.locked
      ? "opacity-90 grayscale hover:opacity-100 transition duration-200"
      : "",
  ].join(" ");

  const createdLabel = post?.createdAt?.toDate?.()
    ? post.createdAt.toDate().toLocaleString()
    : "";

  return (
    <div className={wrapperClass}>
      <div className={gridClass}>
        <div className="min-w-0 space-y-4">
          <div className={postCardClass}>
            {/* HEADER */}
            <div className="flex-none">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 [overflow-wrap:anywhere]">
                    {post.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2 flex-none">
                  <button
                    type="button"
                    onClick={handleSaveToggle}
                    title={isSaved ? "Remove from saved" : "Save this post"}
                    className="rounded-xl p-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    {isSaved ? (
                      <BsBookmarkFill className="text-sky-200" />
                    ) : (
                      <BsBookmark />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onReportClick}
                    className="rounded-xl px-2.5 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    Report
                  </button>
                </div>
              </div>

              {/* META ROW */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <Avatar
                      src={author?.profilePicture ?? DEFAULT_PROFILE_PICTURE}
                      size={36}
                      zoomable
                      badge={author?.badges?.topContributor ?? false}
                      alt={author?.name ?? "Author"}
                    />

                    {author?.badges?.topContributor && (
                      <button
                        type="button"
                        title="Top Contributor · Code-powered"
                        className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTopContributorModal(true);
                        }}
                      >
                        <ShieldIcon className="w-5 h-5 text-sky-200 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0">
                    {author?.id && <AuthorLink author={author} />}
                  </div>
                </div>

                <span className="text-zinc-700">•</span>
                <span className="whitespace-nowrap">{createdLabel}</span>

                {post?.category && (
                  <span className="lg:ml-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-200">
                    <span className="opacity-80">Category</span>
                    <span className="text-zinc-100">{post.category}</span>
                  </span>
                )}
              </div>

              {/* BADGES + LOCK (right on lg+) */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  {post?.badges?.mostInspiring && (
                    <Badge
                      text="Most Inspiring"
                      onClick={(e) => handleBadgeClick(e, "mostInspiring")}
                    />
                  )}
                  {post?.badges?.trending && (
                    <Badge
                      text="Trending"
                      onClick={(e) => handleBadgeClick(e, "trending")}
                    />
                  )}

                  {post.locked && lockedDate && (
                    <span
                      title="This post is archived and cannot be edited or commented"
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
                    >
                      <FiLock className="text-sm" />
                      Archived: {lockedDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* BODY (scroll on lg+) */}
            <div className="mt-6 flex-1 min-h-0 overflow-y-visible lg:overflow-y-auto lg:pr-1 ui-scrollbar">
              <div className="space-y-6">
                {post?.description && (
                  <p className="text-zinc-200 text-base leading-relaxed [overflow-wrap:anywhere]">
                    {post.description}
                  </p>
                )}

                <div className="text-zinc-200 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed">
                  {post?.content}
                </div>

                {Array.isArray(post?.tags) && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <span
                        key={`${tag.text}-${index}`}
                        className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-200"
                      >
                        #{tag.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex-none">
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <ReactionSummary
                  postId={post.id}
                  locked={post.locked}
                  reactionCounts={post.reactionCounts}
                />
              </div>

              {canManagePost && (
                <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={isDeletingPost}
                      className={`ui-button bg-rose-600 text-zinc-50 hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                        isDeletingPost ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {isDeletingPost
                        ? "Deleting..."
                        : "Delete permanently (admin)"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isLgUp && (
          <aside className="hidden lg:block min-w-0">
            <div
              className={`${cardBase} lg:sticky lg:top-24 flex flex-col h-[calc(100vh-9rem)]`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/70">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Comments
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {commentsCount} total
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 ui-scrollbar">
                <Comments
                  postID={postId}
                  comments={comments}
                  showAll
                  locked={post.locked}
                  hideHeader
                  hideForm
                  formWrapperClassName="mt-0"
                  listWrapperClassName="mt-0"
                />
              </div>

              <div className="flex-none border-t border-zinc-800/70 bg-zinc-950/20 px-4 py-3">
                <Comments
                  postID={postId}
                  locked={post.locked}
                  renderOnlyForm
                  formWrapperClassName=""
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {!isLgUp && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => setIsCommentsOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/90 px-4 py-2 text-zinc-100 shadow-lg backdrop-blur hover:bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            aria-label="Open comments"
          >
            <FiMessageCircle className="text-lg" />
            <span className="text-sm font-medium">Comments</span>
            <span className="ml-1 inline-flex min-w-7 justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-xs text-zinc-300">
              {commentsCount}
            </span>
          </button>
        </div>
      )}

      {!isLgUp && (
        <CommentsSheet
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
          postId={postId}
          locked={post.locked}
          count={commentsCount}
          comments={comments}
        />
      )}

      {showBadgeModal && (
        <BadgeModal
          isOpen={showBadgeModal}
          badgeKey={selectedBadge}
          locked={post.locked}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

      <BadgeModal
        isOpen={showTopContributorModal}
        locked={post.locked}
        onClose={() => setShowTopContributorModal(false)}
        authorBadge="topContributor"
      />

      <ConfirmModal
        isOpen={showReportModal}
        title="Are you sure you want to report this post?"
        message="This will notify moderators about this post."
        confirmText="Yes"
        onCancel={() => setShowReportModal(false)}
        onConfirm={onConfirmReport}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Post Permanently"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText={isDeletingPost ? "Deleting..." : "Delete"}
        confirmButtonClass={`ui-button bg-rose-600 text-zinc-50 hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
          isDeletingPost ? "opacity-60 cursor-not-allowed" : ""
        }`}
        cancelButtonClass="ui-button-secondary"
        onCancel={() => {
          if (!isDeletingPost) setDeleteModalOpen(false);
        }}
        onConfirm={handleAdminHardDelete}
      />
    </div>
  );
};

export default PostDetails;
