import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children }) => {
  // State za pracenje autentifikacije korisnika
  const [isAuthenticated, setIsAuthenticated] = useState(null); // `null` dok ne dobijemo odgovor od Firebase-a
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);  // `true` dok traje provera autentifikacije

  useEffect(() => {
    // Listener za promene u autentifikaciji korisnika
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setIsAuthenticated(!!currentUser); // Postavlja `true` ako je korisnik autentifikovan, inace `false`
      setTimeout(() => {
        setIsCheckingAuth(false); // Pauza pre zavrsetka provere radi boljeg korisnickog iskustva
      }, 500);
    });

     // Cisti listener kada se komponenta ukloni
    return () => unsubscribe();
  }, []);

  // Prikaz spinnera tokom provere autentifikacije
  if (isCheckingAuth) {
    return (
      <div className="center-spinner">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-center mt-3">Verifying your session...</p>
      </div>
    );
  }

  // Redirekcija na login ako korisnik nije autentifikovan
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Ako je autentifikovan, prikazujemo decu komponente
  return children;
};

// PropTypes validacija za `children`
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired, // `children` mora biti React Node i obavezan je
};

export default ProtectedRoute;
