import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  // Preuzimamo stanja i metode iz AuthContext-a
  const { user, isLoggingOut, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Prikaz korisnickog interfejsa
  return (
    <div className="container mt-5">
      {/* Prikaz email-a korisnika ili "Guest" ako nije pronadjen */}
      <h1>Welcome, {user ? user.email : "Guest"}</h1>
      {/* Prikaz spinnera tokom logout procesa */}
      {isLoggingOut ? (
        <Spinner message="Logging out..." />
      ) : (
        // Logout dugme
        <button onClick={logout} className="btn btn-danger">
          Logout
        </button>
      )}
      <div className="dashboard-actions mt-4">
        {/* Dugme za kreiranje posta */}
        <button
          onClick={() => navigate("/dashboard/create-post")}
          className="btn btn-primary mt-3"
        >
          Create New Post
        </button>
      </div>
    </div>
  );
};

export default MyPosts;
