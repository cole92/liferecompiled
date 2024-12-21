import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const Dashboard = () => {
  const [user, setUser] = useState(null); // State za korisnika
  const [isVerifying, setIsVerifying] = useState(true); // State za proveru verifikacije
  const [isLoggingOut, setIsLoggingOut] = useState(false); // State za proveru logouta
  const navigate = useNavigate();

 // Verifikacija korisnika
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((currentUser) => {
    setUser(currentUser); // Postavljamo korisnika
    setIsVerifying(false); // Zavrsavamo verifikaciju
    if (!currentUser) {
      setTimeout(() => {
        navigate("/login"); // Preusmeravamo na login ako korisnik nije autentifikovan
      }, 2000); // Dodajemo odlaganje radi bolje UX
    }
  });

  return () => unsubscribe(); // Cistimo listener kada se komponenta unmountuje
}, [navigate]);
  // Funkcija za odjavu korisnka
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Indikator za pokretanje odjave korisnika, koristi se za prikaz spinner-a.

      const logoutPromise = signOut(auth); // Pocinje odjava
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 2000)); // Dodajemo minimalno trajanje spinnera

      await Promise.all([logoutPromise, delayPromise]); // Cekamo obe radnje
      toast.success("Successfully logged out! Redirecting to login...", {
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error("An error occurred during logout. Please try again.");
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false); // Resetujemo stanje odjave nakon uspesne ili neuspesne odjave
    }
  };

  //  Prikaz indikatora za "Verifying session..."
  if (isVerifying) {
    return (
      <div className="center-spinner">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-center mt-3">Verifying your session...</p>
      </div>
    );
  }

  // Prikaz korisnickog interfejsa
  return (
    <div className="container mt-5">
      <h1>Welcome, {user ? user.email : "Guest"}</h1>
      {isLoggingOut ? (
        <div className="center-spinner">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-center mt-3">Logging out...</p>
        </div>
      ) : (
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      )}
      <ToastContainer />
    </div>
  );
};

export default Dashboard;
