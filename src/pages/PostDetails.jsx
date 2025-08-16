import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";

import { AuthContext } from "../context/AuthContext";

import { getPostById } from "../services/fetchPosts";
import { getUserById } from "../services/userService";
import { submitReport } from "../services/reportService";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";

import AuthorLink from "../components/AuthorLink";
import ReactionSummary from "../components/reactions/ReactionSummary";
import Comments from "../components/comments/Comments";
import Spinner from "../components/Spinner";
import ShieldIcon from "../components/ui/ShieldIcon";
import ConfirmModal from "../components/modals/ConfirmModal";
import BadgeModal from "../components/modals/BadgeModal";
import Badge from "../components/ui/Bagde";

import { toggleSavePost } from "../utils/savedPostUtils";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/toastUtils";

/**
 * @component PostDetails
 * Prikazuje detalje blog posta na osnovu ID-ja iz URL-a.
 *
 * - Ucitava podatke o postu (getPostById) i autoru (getUserById) asinhrono
 * - Prikazuje naslov, sadrzaj, informacije o autoru, tagove, reakcije i komentare
 * - Koristi BadgeModal za prikaz PNG bedzeva i ShieldIcon za oznaku Top Contributor-a
 * - Omogucava snimanje/uklanjanje posta iz sacuvanih (saved posts)
 * - Reakcije i komentari su onemoguceni ako je post zakljucan
 * - Prikazuje bedzeve (Most Inspiring, Trending) i datum zakljucavanja ako je primenljivo
 *
 * @returns {JSX.Element} Komponenta sa detaljima posta ili fallback prikazom
 */

const PostDetails = () => {
  const { postId } = useParams(); // ID posta iz URL parametara

  // State za glavni prikaz posta i ucitavanje
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  // State za podatke o autoru
  const [author, setAuthor] = useState(null);

  const { user } = useContext(AuthContext);
  const currentUserId = user?.uid ?? null;
  const postAuthorId = post?.userId ?? null;

  const lockedDate = post?.lockedAt?.toDate().toLocaleDateString();

  // State za modale vezane za bedzeve
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Hook koji proverava da li je post sacuvan od strane trenutnog korisnika (Firestore)
  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post && post.id);

  // Dohvata podatke o postu pri prvom renderu ili promeni postId
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postData = await getPostById(postId);
        setPost(postData);
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        // Zatvaramo loading state bez obzira na uspeh/gresku
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // Kada je post ucitan, dohvatamo podatke o autoru
  useEffect(() => {
    if (post?.userId) {
      const fetchUser = async () => {
        const data = await getUserById(post.userId);
        setAuthor(data);
      };
      fetchUser();
    }
  }, [post]);

  // Fallback prikaz dok traje ucitavanje ili ako post ne postoji
  if (isLoading) return <Spinner />;
  if (!post) return <p>Post not found.</p>;

  // Menja status sacuvanosti posta (toggle)
  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    const newState = await toggleSavePost(user, post.id, isSaved);
    setIsSaved(newState);
  };

  // Otvara modal sa PNG bedzevima za post (sprečava bubbling ka parent elementima)
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
        <div className="bg-white rounded-xl shadow-md p-6">
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
                <img
                  src={author?.profilePicture || DEFAULT_PROFILE_PICTURE}
                  alt="Author avatar"
                  className={`w-10 h-10 rounded-full object-cover ${
                    author?.badges?.topContributor
                      ? "ring-2 ring-purple-800"
                      : ""
                  }`}
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

          {/* Sadrzaj posta */}
          <div className="mt-6 text-gray-700 whitespace-pre-wrap leading-relaxed">
            {post?.content}
          </div>

          {/* Tagovi */}
          {post?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs"
                >
                  #{tag.text}
                </span>
              ))}
            </div>
          )}

          {/* Reakcije i dugme za snimanje */}
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <ReactionSummary postId={post.id} locked={post.locked} />
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
        confirmText={"Yes"}
        onCancel={onCancelReport}
        onConfirm={onConfirmReport}
      />
    </div>
  );
};

export default PostDetails;
