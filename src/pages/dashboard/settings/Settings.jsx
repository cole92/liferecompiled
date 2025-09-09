import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";
import { AuthContext } from "../../../context/AuthContext";
import { useState, useEffect } from "react";
import EditProfileForm from "./EditProfileForm";
import { useContext } from "react";
import {
  SkeletonLine,
  SkeletonCircle,
} from "../../../components/ui/skeletonLoader/SkeletonBits";

/**
 * @component Settings
 *
 * Prikazuje formu za izmenu profila
 *
 * - Dohvata podatke o korisniku iz Firestore-a
 * - Prikazuje `EditProfileForm` sa tim podacima
 *
 * @returns {JSX.Element}
 */

const Settings = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dohvata podatke o trenutnom korisniku
  useEffect(() => {
    if (isCheckingAuth) return;

    if (!user) {
      setUserData(null);
      setIsLoading(false);
      return;
    }
    let canceled = false;

    const fetchUserData = async () => {
      setIsLoading(true);

      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);

        if (!canceled) {
          setUserData(snap.exists ? { id: snap.id, ...snap.data() } : null);
        }
      } catch (error) {
        if (!canceled) console.error("Error fetching user data:", error);
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchUserData();

    return () => {
      canceled = true;
    };
  }, [user, isCheckingAuth]);

  if (isCheckingAuth) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded">
      <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

      {/* Forma za izmenu korisnickih podataka */}
      {isLoading && (
        <div className="mx-auto mt-2 space-y-2 max-w-xl">
          <SkeletonCircle size={150} />
          <SkeletonLine w="w-full" h="h-4" />
          <SkeletonLine w="w-5/6" h="h-4" />
          <SkeletonLine w="w-2/3" h="h-4" />
        </div>
      )}
      {userData && <EditProfileForm userData={userData} />}

      {!isLoading && !userData && (
        <p className="text-gray-600">No user data found.</p>
      )}
    </div>
  );
};

export default Settings;
