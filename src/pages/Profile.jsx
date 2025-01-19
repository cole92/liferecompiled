import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import EditProfileModal from "../components/EditProfileModal";

const Profile = () => {
  const [userData, setUserData] = useState(null); // State za cuvanje korisnickih podataka
  const [loading, setLoading] = useState(true); // State za pracenje statusa ucitavanja
  const [showModal, setShowModal] = useState(false);  // State za pracenje prikazivanja modala

  // useEffect koji se izvrsava jednom prilikom mount-a komponente
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Dobijanje trenutnog korisnika preko Firebase autentifikacije
        const auth = getAuth();
        const uid = auth.currentUser?.uid; // Proveravamo da li postoji trenutni korisnik

        // Referenca na dokument u Firestore bazi
        const docRef = doc(db, "users", uid);
         // Dobijanje podataka o korisniku iz Firestore
        const docSnap = await getDoc(docRef);
         // Ako dokument postoji, azuriramo state sa podacima i ID-jem dokumenta
        if (docSnap.exists()) {
          setUserData({ ...docSnap.data(), id: docSnap.id }); // Dodajemo id dokumenta
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);  // Postavljamo loading na false nakon pokusaja dohvata podataka
      }
    };

    fetchUserData(); // Poziv funkcije za dohvat korisnickih podataka
  }, []); 

  // Funkcija za lokalno azuriranje korisnickih podataka nakon promene
  const updateUserData = (updatedFields) => {
    setUserData((prevData) => ({
      ...prevData, // Zadrzavamo postojece podatke
      ...updatedFields // Azuriramo samo promenjena polja
    }));
  };
  // Prikazujemo poruku o ucitavanju dok se podaci preuzimaju
  if (loading) return <p>Loading...</p>;
  // Prikazujemo poruku ako korisnicki podaci nisu pronadjeni
  if (!userData) return <p>No user data found!</p>;

  return (
    <div className="container mt-4">
      {/* Gornji deo: Profilna slika centrirana */}
      <div className="text-center mb-4">
        <img
          src={userData.profilePicture}
          alt="Profile pic"
          className="rounded-circle"
          style={{ width: "150px", height: "150px" }}
        />
      </div>

      {/* Srednji deo: Dva stupca - Levo i Desno */}
      <div className="row mb-4">
        {/* Leva sekcija */}
        <div className="col-md-6 text-center text-md-start">
          <h4>{userData.name}</h4> {/* Prikaz imena korisnika */}
          <p>{userData.email}</p> {/* Prikaz email adrese korisnika */}
        </div>

        {/* Desna sekcija */}
        <div className="col-md-6 text-center text-md-end">
           {/* Formatiran datum kreiranja naloga */}
          <p>Account Created: {userData.createdAt?.toDate().toLocaleString()}</p>
          <p>Status: {userData.status}</p> {/* Prikaz statusa korisnika */}
        </div>
      </div>

      {/* Donji deo: Biografija i dugme */}
      <div className="text-center">
        <p>
          Bio: {userData.bio}  {/* Prikaz biografije korisnika */}
        </p>
        {/* Dugme za otvaranje Edit Profile modala */}
        <button className="btn btn-primary"
          onClick={() => setShowModal(true)} // Prikazivanje modala
        >
          Edit Profile
        </button>
      </div>
       {/* Komponenta za uredjivanje profila */}
      <EditProfileModal
        show={showModal} // Prosledjivanje state-a za prikazivanje
        handleClose={() => setShowModal(false)} // Funkcija za zatvaranje modala
        userData={userData} // Prosledjivanje korisnickih podataka
        updateUserData={updateUserData} // Prosledjivanje funkcije za azuriranje
      />
    </div>
  );
};

export default Profile;
