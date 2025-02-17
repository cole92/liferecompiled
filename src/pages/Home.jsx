import { useEffect, useState } from "react";
import { getPosts } from "../services/fetchPosts"; // Import funkcije
import PostsList from "../components/PostsList";

const Home = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getPosts(); // Pozivamo funkciju za dohvatanje postova
        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchData(); // Pozivamo funkciju kada se komponenta mount-uje
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      <PostsList posts={posts} />
    </div>
  );
};

export default Home;
