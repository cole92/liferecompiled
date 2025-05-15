import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  // Preuzimamo stanja i metode iz AuthContext-a
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Prikaz korisnickog interfejsa
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-2">
        Welcome, {user ? user.email : "Guest"}
      </h2>
      <button
        onClick={() => navigate("/dashboard/create-post")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Create New Post
      </button>
    </div>
  );
};

export default MyPosts;
