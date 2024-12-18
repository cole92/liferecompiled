import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children }) => {
  // Proveravamo da li postoji ulogovan korisnik
  const isAuthenticated = auth.currentUser;

  // Ako nije preusmeravamo ga na login (replace da ne mozemo koristiti 'back' vracanje na predhodnu stranu)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Ako jeste autentifikovan, prikazujemo decu komponente
  return children;
};

// PropTypes validacija
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired, // children mora biti React Node i obavezan je
};

export default ProtectedRoute;
