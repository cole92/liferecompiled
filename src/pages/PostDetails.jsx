import { useParams } from "react-router-dom";
import { auth } from "../firebase";
import { useEffect, useState } from "react";
import { getPostById } from "../services/fetchPosts";
import { getUserById } from "../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import PostReactions from "../components/PostReactions";
import Comments from "../components/comments/Comments";
import Spinner from "../components/Spinner";
import { FiLock } from "react-icons/fi";

/**
 * Prikazuje detalje o pojedinacnom blog postu na osnovu ID-ja iz URL-a.
 * Prikazuje naslov, sadrzaj, informacije o autoru, tagove, reakcije i komentare.
 *
 * @component
 * @returns {JSX.Element} Komponenta sa detaljima posta ili fallback porukom/spinerom.
 *
 * @example
 * // URL: /posts/abc123
 * <PostDetails />
 */

const PostDetails = () => {
  const { postId } = useParams(); // Izvlacimo ID posta iz URL parametara
  const [post, setPost] = useState(null); // State za podatke o postu
  const [isLoading, setIsLoading] = useState(true); // State za prikaz ucitavanja
  const [author, setAuthor] = useState(null);
  const userId = auth.currentUser?.uid;
  const lockedDate = post?.lockedAt?.toDate().toLocaleDateString();

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
            <img
              src={author?.profilePicture || DEFAULT_PROFILE_PICTURE}
              alt="Autor avatar"
              className="w-12 h-12 rounded-full"
            />
            <span>{author?.name}</span>
            <span className="mx-1">·</span>
            {/* Pretvaramo Firestore timestamp u lokalni string */}
            <span>{post?.createdAt?.toDate().toLocaleString()}</span>
          </div>
          <span className="mt-2 md:mt-0">📂 Category: {post?.category}</span>
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
            <PostReactions postId={postId} locked={post.locked}/>
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
    </div>
  );
};
export default PostDetails;
