import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";

const Stats = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Spinner message="Loading statistics..." />;

  return <h1>Statistika sekcija</h1>;
};

export default Stats;
