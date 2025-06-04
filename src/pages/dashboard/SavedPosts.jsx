import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";

const SavedPosts = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Spinner message="Loading saved posts..." />;

  return <h1>Saved Posts sekcija</h1>;
};

export default SavedPosts;