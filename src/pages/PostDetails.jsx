import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";

import { AuthContext } from "../context/AuthContext";

import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { functions, db } from "../firebase";

import { getUserById } from "../services/userService";
import { submitReport } from "../services/reportService";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";
import { normalizePostDoc } from "../mappers/posts/normalizePostDoc";

import AuthorLink from "../components/AuthorLink";
import ReactionSummary from "../components/reactions/ReactionSummary";
import Comments from "../components/comments/Comments";
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

const PostDetails = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [author, setAuthor] = useState(null);

  const { user } = useContext(AuthContext);
  const currentUserId = user?.uid ?? null;
  const postAuthorId = post?.userId ?? null;
  const isAdmin = user?.isAdmin === true;
  const isAuthor =
    currentUserId && postAuthorId && currentUserId === postAuthorId;
  const canManagePost = isAuthor || isAdmin;

  const lockedDate = post?.lockedAt?.toDate?.()?.toLocaleDateString?.() ?? null;

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post && post.id);

  // Post subscription: source of truth je posts/{postId}
  // getPostById ostaje da bi zadrzao isti normalize/shape kao svuda
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
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [postId]);
  // Author fetch: zavisi samo od userId (da ne refetchuje autora na svaku reakciju)
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

  const onCancelReport = () => setShowReportModal(false);

  const handleAdminHardDelete = async () => {
    if (!isAdmin || isDeletingPost) {
      return;
    }

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

  // Ova funkcija ti vise realno ne treba za reakcije kad imas onSnapshot,
  // ali je ostavljam da ne diramo ostalu logiku (moze da posluzi za manuelni refresh ako zelis).
  return (
    <div
      className={`${
        post.locked
          ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
          : ""
      }`}
    >
      <div className="max-w-5xl mx-auto my-8 space-y-8">
        {/* --- POST HEADER --- */}
        <div
          className={`bg-white rounded-xl shadow-md p-6 ${
            post.badges?.trending ? "border-2 border-red-500" : ""
          }`}
        >
          {/* Naslov i statusne oznake */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>

            {/* Bedzevi i status zakljucavanja */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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
                  title="This post is locked and cannot be edited or commented"
                  className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1"
                >
                  <FiLock className="text-sm" />
                  Locked: {lockedDate}
                </span>
              )}
            </div>
          </div>

          {/* Autor i meta podaci */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-500 border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Avatar
                  src={author?.profilePicture ?? DEFAULT_PROFILE_PICTURE}
                  size={40}
                  zoomable
                  badge={author?.badges?.topContributor ?? false}
                  alt={author?.name ?? "Author"}
                />
                {author?.badges?.topContributor && (
                  <div
                    title="Top Contributor · Code-powered"
                    className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTopContributorModal(true);
                    }}
                  >
                    <ShieldIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                )}
              </div>
              {author?.id && <AuthorLink author={author} />}
            </div>
            <span className="mx-1">·</span>
            <span>{post?.createdAt?.toDate().toLocaleString()}</span>
            <span className="mx-1">·</span>
            <span className="text-gray-600">📂 {post?.category}</span>
          </div>

          {/* Description (summary) */}
          {post?.description && (
           <p className="mt-5 text-gray-700 text-base leading-relaxed break-words overflow-x-hidden">
              {post.description}
            </p>
          )}

          {/* Content */}
          <div className="mt-6 text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-x-hidden">
            {post?.content}
          </div>

          {/* Tagovi */}
          {post.tags.map((tag, index) => (
            <span
              key={`${tag.text}-${index}`}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs"
            >
              #{tag.text}
            </span>
          ))}

          {/* Reakcije i dugme za snimanje */}
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <ReactionSummary
              postId={post.id}
              locked={post.locked}
              reactionCounts={post.reactionCounts}
            />

            <button
              onClick={handleSaveToggle}
              title={isSaved ? "Remove from saved" : "Save this post"}
              className="hover:scale-110 transition"
            >
              {isSaved ? (
                <BsBookmarkFill className="text-slate-950" />
              ) : (
                <BsBookmark className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Report dugme */}
          <button
            type="button"
            onClick={onReportClick}
            className="hover:underline"
            aria-label="Report post"
          >
            Report
          </button>

          {/* Admin / author controls (WIP) */}
          {canManagePost && (
            <div className="mt-4 flex gap-2 border-b pb-4">
              {/* Ovde ce kasnije ici i owner kontrole, ako ih budemo dodavali */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={isDeletingPost}
                  className={`px-3 py-1 text-sm rounded-md bg-red-600 text-white transition ${
                    isDeletingPost
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-red-700"
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

        {/* Sekcija komentara */}
        <Comments
          postID={postId}
          userId={currentUserId}
          showAll={true}
          locked={post.locked}
          repliesPreviewCount={1}
        />
      </div>

      {/* Modali za bedzeve */}
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

      {/* Modal za potvrdu prijave */}
      <ConfirmModal
        isOpen={showReportModal}
        title="Are you sure you want to report this post?"
        message="This will notify moderators about this post."
        confirmText="Yes"
        onCancel={onCancelReport}
        onConfirm={onConfirmReport}
      />

      {/* Modal za admin hard delete posta */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Post Permanently"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText={isDeletingPost ? "Deleting..." : "Delete"}
        confirmButtonClass={`bg-red-600 hover:bg-red-700 hover:scale-105 transition duration-200 ${
          isDeletingPost ? "opacity-60 cursor-not-allowed" : ""
        }`}
        cancelButtonClass="bg-gray-300 text-gray-800 hover:bg-gray-400 hover:scale-105 transition duration-200"
        onCancel={() => {
          if (!isDeletingPost) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={handleAdminHardDelete}
      />
    </div>
  );
};

export default PostDetails;
