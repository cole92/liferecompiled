import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock, FiMessageCircle, FiFlag } from "react-icons/fi";

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

const REPORT_POST_AUTH_TOAST_ID = "report:post:auth";
const REPORT_POST_SELF_TOAST_ID = "report:post:self";
const REPORT_POST_SUCCESS_TOAST_ID = "report:post:success";
const REPORT_POST_ERROR_TOAST_ID = "report:post:error";

const POST_DELETE_SUCCESS_TOAST_ID = "post:delete:success";
const POST_DELETE_ERROR_TOAST_ID = "post:delete:error";

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

const MAX_TAGS_IN_DETAILS = 12;

const normalizeTagText = (t) => {
  const raw = String(t ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^#+/, "").trim();
};

const buildUniqueTags = (rawTags, max = MAX_TAGS_IN_DETAILS) => {
  const raw = Array.isArray(rawTags) ? rawTags : [];

  const normalized = raw
    .map((t) => (typeof t === "string" ? t : (t?.text ?? t?.name ?? "")))
    .map((t) => normalizeTagText(t))
    .filter(Boolean);

  const seen = new Set();
  const out = [];

  for (const t of normalized) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }

  return out;
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

  const tags = useMemo(() => buildUniqueTags(post?.tags), [post?.tags]);

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
      showInfoToast("Please login to report 😊", {
        toastId: REPORT_POST_AUTH_TOAST_ID,
      });
      return;
    }
    setShowReportModal(true);
  };

  const onConfirmReport = async () => {
    if (!user) {
      showInfoToast("Please login to report 😊", {
        toastId: REPORT_POST_AUTH_TOAST_ID,
      });
      setShowReportModal(false);
      return;
    }

    if (currentUserId && postAuthorId && currentUserId === postAuthorId) {
      showInfoToast("You can't report your own post.", {
        toastId: REPORT_POST_SELF_TOAST_ID,
        autoClose: 1600,
      });
      setShowReportModal(false);
      return;
    }

    try {
      await submitReport({
        type: "post",
        targetId: postId,
        reportedBy: currentUserId,
      });

      showSuccessToast("Post reported. Thank you!", {
        toastId: REPORT_POST_SUCCESS_TOAST_ID,
        autoClose: 1400,
      });
    } catch (error) {
      showErrorToast("Report failed. Try again.", {
        toastId: REPORT_POST_ERROR_TOAST_ID,
      });
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

      showSuccessToast("Post permanently deleted.", {
        toastId: POST_DELETE_SUCCESS_TOAST_ID,
        autoClose: 1400,
      });

      setDeleteModalOpen(false);
      navigate("/dashboard/moderation");
    } catch (error) {
      console.error("Delete error:", error);
      showErrorToast("Failed to delete post.", {
        toastId: POST_DELETE_ERROR_TOAST_ID,
      });
    } finally {
      setIsDeletingPost(false);
    }
  };

  const createdLabelShort = post?.createdAt?.toDate?.()
    ? post.createdAt.toDate().toLocaleDateString()
    : "";

  const createdLabelLong = post?.createdAt?.toDate?.()
    ? post.createdAt.toDate().toLocaleString()
    : "";

  const wrapperClass =
    "w-full max-w-7xl mx-auto my-0 sm:my-8 " +
    "pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:pb-0";

  const gridClass =
    "grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start";

  const cardBase =
    "rounded-none border-0 bg-transparent ring-0 shadow-none " +
    "sm:rounded-2xl sm:border sm:border-zinc-800/70 sm:bg-zinc-950/40 sm:ring-1 sm:ring-zinc-100/5 sm:shadow-sm";

  const postCardClass = [
    cardBase,
    "overflow-visible sm:overflow-hidden p-1 sm:p-6",
    "flex flex-col",
    "min-h-[calc(100vh-7.5rem)] min-h-[calc(100svh-7.5rem)] sm:min-h-0",
    "lg:h-[calc(100vh-9rem)]",
    post.locked
      ? "opacity-90 grayscale hover:opacity-100 transition duration-200"
      : "",
  ].join(" ");

  const TAG_PILL =
    "inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 " +
    "px-3 py-1 text-xs text-sky-200 shrink-0 whitespace-nowrap";

  return (
    <div className={wrapperClass}>
      <div className={gridClass}>
        <div className="min-w-0 space-y-4">
          <div className={postCardClass}>
            {/* HEADER */}
            <div className="flex-none">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="relative flex-none">
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
                        className="
                          absolute top-0 right-1
                          translate-x-1/3 -translate-y-[45%]
                          cursor-pointer group
                          z-10
                          rounded-md
                          focus:outline-none
                          focus-visible:ring-2 focus-visible:ring-sky-400
                          focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
                        "
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
                    {author?.id && (
                      <AuthorLink
                        author={author}
                        className="inline-block max-w-[10rem] sm:max-w-[22rem] truncate align-middle"
                      />
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span className="whitespace-nowrap sm:hidden">
                        {createdLabelShort}
                      </span>
                      <span className="hidden whitespace-nowrap sm:inline">
                        {createdLabelLong}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-none shrink-0">
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
                    aria-label="Report"
                    className="rounded-xl px-2.5 py-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    <FiFlag className="text-lg sm:hidden" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                </div>
              </div>

              <h1 className="mt-3 text-[1.45rem] leading-tight sm:text-3xl font-bold text-zinc-100 break-words">
                {post.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {post?.category && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-200"
                    aria-label={`Category: ${post.category}`}
                    title={`Category: ${post.category}`}
                  >
                    <span className="hidden sm:inline opacity-80">
                      Category
                    </span>
                    <span className="text-zinc-100">{post.category}</span>
                  </span>
                )}

                <div className="ml-auto flex flex-wrap items-center gap-2 justify-end">
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
                </div>

                {post.locked && lockedDate && (
                  <span
                    title="This post is archived and cannot be edited or commented"
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 text-xs text-zinc-200"
                  >
                    <FiLock className="w-4 h-4 shrink-0" />
                    <span className="relative top-px">
                      Archived: {lockedDate}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* BODY */}
            <div className="mt-6 flex-1 min-h-0 overflow-y-visible lg:overflow-y-auto lg:pr-1 ui-scrollbar">
              <div className="space-y-6">
                {post?.description && (
                  <p className="text-zinc-200 text-base leading-relaxed break-words">
                    {post.description}
                  </p>
                )}

                <div className="text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
                  {post?.content}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex-none">
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <div className="min-h-[2.25rem]">
                  <div
                    className="relative -mx-1 px-1"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div
                      className={
                        "tag-rail flex items-center gap-2 flex-nowrap w-full " +
                        "overflow-x-auto overflow-y-hidden overscroll-x-contain " +
                        "pb-3 touch-pan-x [-webkit-overflow-scrolling:touch]"
                      }
                    >
                      {tags.length > 0 ? (
                        tags.map((t, index) => (
                          <span
                            key={`${t}-${index}`}
                            className={TAG_PILL}
                            title={`#${t}`}
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600">No tags</span>
                      )}
                    </div>

                    <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950/30 to-transparent" />
                  </div>
                </div>

                <div className={tags.length > 0 ? "mt-2" : "mt-3"}>
                  <ReactionSummary
                    postId={post.id}
                    locked={post.locked}
                    reactionCounts={post.reactionCounts}
                  />
                </div>
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-3 py-3">
            <button
              type="button"
              onClick={() => setIsCommentsOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-zinc-100 shadow-lg hover:bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Open comments"
            >
              <FiMessageCircle className="text-lg" />
              <span className="text-sm font-medium">Comments</span>
              <span className="ml-1 inline-flex min-w-7 justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-xs text-zinc-300">
                {commentsCount}
              </span>
            </button>
          </div>
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
