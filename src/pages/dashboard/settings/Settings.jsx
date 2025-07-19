import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";
import EditProfileForm from "./EditProfileForm";

/**
 * @component Settings
 *
 * Prikazuje formu za izmenu profila u okviru dashboard-a.
 *
 * - Dohvata podatke o korisniku iz Firestore-a
 * - Prikazuje `EditProfileForm` sa tim podacima
 *
 * @returns {JSX.Element}
 */

const Settings = () => {
  const [userData, setUserData] = useState(null);

  // Dohvata podatke o trenutnom korisniku
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setUserData(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded">
      <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

      {/* Forma za izmenu korisnickih podataka */}
      {userData && <EditProfileForm userData={userData} />}
    </div>
  );
};

export default Settings;
