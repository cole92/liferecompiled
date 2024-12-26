import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Spinner from "../components/Spinner";

// Dashboard komponenta za prikaz podataka korisnika
const Dashboard = () => {
  // Preuzimamo stanja i metode iz AuthContext-a
  const { user, isLoggingOut, logout } = useContext(AuthContext);

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
    </div>
  );
};

export default Dashboard;
