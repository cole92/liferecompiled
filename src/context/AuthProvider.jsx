import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, signOut } from "../firebase";
import {
  showErrorToast,
  showSuccessToast,
  showInfoToast,
} from "../utils/toastUtils";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * @component AuthProvider
 * Omotava aplikaciju i obezbedjuje globalni kontekst za autentifikaciju.
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
  const [userProfileError, setUserProfileError] = useState(null); // optional flag for profile load issues

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      // Nema auth user-a → klasicno odjavljeno stanje
      if (!currentUser) {
        setUser(null);
        setIsAuthenticated(false);
        setUserProfileError(null);
        setIsCheckingAuth(false);
        return;
      }

      // Postoji auth session → pokusavamo da ucitamo user doc
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);

        const userData = userSnap.exists() ? userSnap.data() : {};
        const role = userData.role || "user";
        const isAdmin = role === "admin";

        setUser({
          ...userData,
          uid: currentUser.uid,
          email: currentUser.email,
          role,
          isAdmin,
        });

        setIsAuthenticated(true);
        setUserProfileError(null);
      } catch (error) {
        console.error("Greska pri dohvatanju korisnika:", error);

        // Meksi fallback:
        // - auth session postoji → i dalje smo ulogovani
        // - tretiramo user-a kao obicnog user-a bez admin prava
        const fallbackUser = {
          uid: currentUser.uid,
          email: currentUser.email ?? null,
          displayName: currentUser.displayName ?? null,
          role: "user",
          isAdmin: false,
        };

        setUser(fallbackUser);
        setIsAuthenticated(true);
        setUserProfileError(error);

        // Diskretan UI hint da profil nije ucitan do kraja
        showInfoToast(
          "We could not fully load your profile. Some features may be limited."
        );
      } finally {
        setIsCheckingAuth(false);
      }
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
        userProfileError, // mozes da koristis ako negde treba da znas da profil nije full ucitan
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
