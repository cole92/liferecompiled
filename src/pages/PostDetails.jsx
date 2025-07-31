import { useContext, useEffect, useState } from "react";

import { useParams } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";

import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import { getPostById } from "../services/fetchPosts";
import { getUserById } from "../services/userService";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";

import AuthorLink from "../components/AuthorLink";
import ReactionSummary from "../components/reactions/ReactionSummary";
import Comments from "../components/comments/Comments";
import Spinner from "../components/Spinner";
import ShieldIcon from "../components/ui/ShieldIcon";
import BadgeModal from "../components/modals/BadgeModal";
import Badge from "../components/ui/Bagde";

import { toggleSavePost } from "../utils/savedPostUtils";


/**
 * @component PostDetails
 * Prikazuje detalje blog posta na osnovu ID-ja iz URL-a.
 *
 * - Prikazuje naslov, sadrzaj, informacije o autoru, tagove, reakcije i komentare
 * - Koristi se BadgeModal za prikaz PNG bedzeva i ShieldIcon za autora
 * - Reakcije i komentari su onemoguceni ako je post zakljucan
 *
 * @returns {JSX.Element} Komponenta sa detaljima posta ili fallback prikazom
 */

const PostDetails = () => {
  const { postId } = useParams(); // Izvlacimo ID posta iz URL parametara
  const [post, setPost] = useState(null); // State za podatke o postu
  const [isLoading, setIsLoading] = useState(true); // State za prikaz ucitavanja
  const [author, setAuthor] = useState(null);
  const userId = auth.currentUser?.uid;
  const { user } = useContext(AuthContext);
  const lockedDate = post?.lockedAt?.toDate().toLocaleDateString();
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Proverava da li je post sacuvan od strane korisnika (hook koristi Firestore)
  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post && post.id);

  useEffect(() => {
    // Dohvata podatke o postu kada se komponenta montira ili promeni postId
    const fetchPost = async () => {
      try {
        const postData = await getPostById(postId);
        setPost(postData);
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  useEffect(() => {
    // Kada se post ucita, dohvatamo podatke o autoru
    if (post?.userId) {
      const fetchUser = async () => {
        const data = await getUserById(post.userId);
        setAuthor(data);
      };

      fetchUser();
    }
  }, [post]);

  if (isLoading) return <Spinner />; // Prikazujemo spinner dok se post ucitava
  if (!post) return <p>Post not found.</p>; // Ako post nije prondjen, prikazujemo fallback poruku

  const handleSaveToggle = async (e) => {
    e.stopPropagation();

    const newState = await toggleSavePost(user, post.id, isSaved);
    setIsSaved(newState);
  };

  // Otvara modal sa PNG bedzevima za post
  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  return (
    <div
      className={`${
        post.locked
          ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
          : ""
      }`}
    >
      <div className="max-w-4xl mx-auto my-8 p-4 md:p-6 bg-white rounded-lg shadow-lg">
        {/* Naslov posta */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>
        <div className="relative">
          {/* Klikabilni PNG bedzevi (💡, 🔥) — otvaraju BadgeModal */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
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
        </div>
        {post.locked && lockedDate && (
          <div className="mt-2 text-sm">
            <span
              title="This post is locked and cannot be edited or commented"
              className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1"
            >
              <FiLock className="text-sm" />
              Locked by author on: {lockedDate}
            </span>
          </div>
        )}

        {/* Autor, datum, kategorija */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center text-sm text-gray-500 mb-4 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img
                src={author?.profilePicture || DEFAULT_PROFILE_PICTURE}
                alt="Autor avatar"
                className={`w-12 h-12 rounded-full ${
                  author?.badges?.topContributor ? "ring-2 ring-purple-800" : ""
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

            {/* Link ka autoru post-a */}
            {author?.id && <AuthorLink author={author} />}
            <span className="mx-1">·</span>
            {/* Pretvaramo Firestore timestamp u lokalni string */}
            <span>{post?.createdAt?.toDate().toLocaleString()}</span>
          </div>
          <span className="mt-2 md:mt-0">📂 Category: {post?.category}</span>

          {/* Dugme za snimanje posta toggle */}
          <div
            onClick={handleSaveToggle}
            className="hover:scale-110 transition"
            title={isSaved ? "Remove from saved" : "Save this post"}
          >
            {isSaved ? (
              <BsBookmarkFill className="text-slate-950" />
            ) : (
              <BsBookmark className="text-gray-400" />
            )}
          </div>
        </div>

        {/* Opis posta */}
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">
          {post?.content}
        </div>

        {/* Tagovi */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post?.tags?.map((tag) => (
            <span
              key={tag.id}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
            >
              #{tag.text}
            </span>
          ))}
        </div>

        {/* Reakcije */}
        <div className="bg-white py-3 border-t shadow mt-4">
          <div className="flex gap-2 justify-center">
            <ReactionSummary postId={post.id} locked={post.locked} />
          </div>
        </div>

        {/* Komentari */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            💬 Comments
          </h3>

          <Comments
            postID={postId}
            userId={userId}
            showAll={true}
            locked={post.locked}
          />
        </div>
      </div>
      {/* Modal koji prikazuje osvojene bedzeve za ovaj post (pasivan prikaz ako je post zakljucan) */}
      {showBadgeModal && (
        <BadgeModal
          isOpen={showBadgeModal}
          badgeKey={selectedBadge}
          locked={post.locked}
          onClose={() => setShowBadgeModal(false)}
        />
      )}
      {/* Modal koji prikazuje Top Contributor badge (pasivan prikaz ako je post zakljucan) */}
      <BadgeModal
        isOpen={showTopContributorModal}
        locked={post.locked}
        onClose={() => setShowTopContributorModal(false)}
        authorBadge="topContributor"
      />
    </div>
  );
};
export default PostDetails;
