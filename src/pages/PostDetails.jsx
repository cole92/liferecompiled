import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPostById } from "../services/fetchPosts";
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
  const { postId } = useParams();                   // Izvlacimo ID posta iz URL parametara
  const [post, setPost] = useState(null);           // State za podatke o postu
  const [isLoading, setIsLoading] = useState(true); // State za prikaz ucitavanja

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
  
  if (isLoading) return <Spinner />         // Prikazujemo spinner dok se post ucitava
  if (!post) return <p>Post not found.</p>; // Ako post nije prondjen, prikazujemo fallback poruku


  return (
    <div className="post-details">
      <h1>{post.title}</h1>
      <p>{post.description}</p>
      {/* Ostali podaci o postu dolaze kasnije */}
    </div>
  );
};

export default PostDetails;
