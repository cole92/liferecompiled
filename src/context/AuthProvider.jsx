import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, signOut } from "../firebase";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import { AuthContext } from "./AuthContext";

/**
 * Kontekst provajder za autentifikaciju korisnika.
 *
 * - Prati trenutno prijavljenog korisnika
 * - Proverava autentifikaciju pri svakom pokretanju aplikacije
 * - Omogucava logout funkcionalnost uz toast notifikacije
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponente koje koriste ovaj kontekst
 * @returns {JSX.Element} AuthContext.Provider sa vrednostima za korisnika
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Trenutni korisnik
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Da li je korisnik prijavljen
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Da li traje provera autentifikacije
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Da li traje proces odjave

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const firestoreData = userSnap.data();

            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              ...firestoreData, // name, profilePicture, itd.
            });
          } else {
            // Fallback ako korisnicki dokument ne postoji
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
            });
          }

          setIsAuthenticated(true);
        } catch (error) {
          console.error("Greska pri dohvatanju korisnika iz Firestore:", error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // Nema korisnika (nije prijavljen)
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsCheckingAuth(false); // Zavrsena provera autentifikacije
    });

    return () => unsubscribe(); // Cleanup listenera
  }, []);

  // Logout funkcija sa proverom mreze i toast porukama
  const logout = async () => {
    try {
      if (!navigator.onLine) {
        showErrorToast(
          "You are offline. Please connect to the internet and try again."
        );
        return;
      }

      setIsLoggingOut(true); // Prikaz spinnera
      await new Promise((resolve) => setTimeout(resolve, 500)); // Kratka pauza

      await signOut(auth); // Firebase logout
      showSuccessToast(
        "You have been logged out successfully. Redirecting to login..."
      );
    } catch (error) {
      showErrorToast(
        "Oops! Something went wrong during logout. Please try again."
      );
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false); // Ugasiti spinner
    }
  };

  // Deljenje podataka kroz kontekst
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isCheckingAuth,
        isLoggingOut,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Validacija children prop-a
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
