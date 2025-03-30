import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPostById } from "../services/fetchPosts";
import { getUserById } from "../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import Spinner from "../components/Spinner";

/**
 * Prikazuje detalje o pojedinacnom blog postu na osnovu ID-ja iz URL-a.
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
    <div className="max-w-4xl mx-auto my-8 p-4 md:p-6 bg-white rounded-lg shadow-lg">
      {/* Naslov posta */}
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>

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
      <div className="sticky bottom-0 bg-white py-3 border-t shadow">
        <div className="flex gap-2 justify-center">
          <button className="border px-3 py-1 rounded-full text-sm">
            💡 Idea (5)
          </button>
          <button className="border px-3 py-1 rounded-full text-sm">
            🔥 Hot (3)
          </button>
        </div>
      </div>

      {/* Komentari */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          💬 Comments
        </h3>

        {/* Primer komentara 1 */}
        <div className="mb-4 border-b pb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <img
              src="https://via.placeholder.com/30"
              alt="Korisnik avatar"
              className="w-6 h-6 rounded-full"
            />
            <span>Korisnik 1</span>
            <span className="mx-1">·</span>
            <span>pre 2 sata</span>
          </div>
          <p className="text-gray-700 ml-8">
            Ovo je placeholder za sadržaj prvog komentara.
          </p>
        </div>

        {/* Primer komentara 2 */}
        <div className="mb-4 border-b pb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <img
              src="https://via.placeholder.com/30"
              alt="Korisnik avatar"
              className="w-6 h-6 rounded-full"
            />
            <span>Korisnik 2</span>
            <span className="mx-1">·</span>
            <span>pre 3 sata</span>
          </div>
          <p className="text-gray-700 ml-8">
            Ovo je placeholder za sadržaj drugog komentara.
          </p>
        </div>

        {/* Forma za dodavanje komentara */}
        <div className="mt-6">
          <textarea
            placeholder="Dodaj komentar..."
            className="w-full border rounded-lg p-2 mb-2 focus:outline-none"
            rows={3}
          ></textarea>
          <button className="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm">
            Pošalji komentar
          </button>
        </div>
      </div>
    </div>
  );
};
export default PostDetails;
