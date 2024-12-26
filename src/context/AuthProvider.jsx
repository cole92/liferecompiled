import { useState, useEffect } from "react";
import { auth, signOut } from "../firebase";
import PropTypes from "prop-types";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";
import { AuthContext } from "./AuthContext";

// Kreiramo AuthProvider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Trenutni korisnik
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Da li je korisnik autentifikovan
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Da li traje provera autentifikacije
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Da li traje proces odjave

  useEffect(() => {
    // Provera trenutnog korisnika pri ucitavanju aplikacije
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser); // Postavljamo trenutnog korisnika
      setIsAuthenticated(!!currentUser); // Da li korisnik postoji (true/false)
      setIsCheckingAuth(false); // Zavrsavamo proveru
    });
    // Cistimo listener kada se komponenta unmountuje
    return () => unsubscribe();
  }, []);

  const logout = async () => {
  try {
    // Provera mreze pre odjave
    if (!navigator.onLine) {
      showErrorToast("You are offline. Please connect to the internet and try again.");
      return; // Blokiramo dalje izvrsavanje
    }
    setIsLoggingOut(true); // Pokrecemo spinner za logout
    await new Promise((resolve) => setTimeout(resolve, 500)); // Pauza za spinner

    await signOut(auth); // Firebase odjava
    showSuccessToast("You have been logged out successfully. Redirecting to login...", {
    });
  } catch (error) {
    showErrorToast("Oops! Something went wrong during logout. Please try again.");
    console.error("Logout error:", error); // Log greske
  } finally {
    setIsLoggingOut(false); // Zaustavljamo spinner
  }
};
  // Vrednosti koje delimo kroz AuthContext
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

// PropTypes validacija za children
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
