import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, signOut } from "../firebase";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * @component AuthProvider
 * Omotava aplikaciju i obezbeđuje globalni kontekst za autentifikaciju.
 *
 * - Prati trenutno ulogovanog korisnika i njegovo stanje
 * - Omogucava logout sa proverom mreze i vizuelnim indikatorima
 * - Proverava stanje autentifikacije na mount-u
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Sve child komponente
 *
 * @returns {JSX.Element} Kontekst sa korisnickim podacima i statusima
 */


const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            ...(userSnap.exists() ? userSnap.data() : {}),
          });

          setIsAuthenticated(true);
        } catch (error) {
          console.error("Greska pri dohvatanju korisnika:", error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      if (!navigator.onLine) {
        showErrorToast(
          "You are offline. Please connect to the internet and try again."
        );
        return;
      }

      setIsLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await signOut(auth);

      showSuccessToast(
        "You have been logged out successfully. Redirecting to login..."
      );

      setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (error) {
      showErrorToast(
        "Oops! Something went wrong during logout. Please try again."
      );
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

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

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
