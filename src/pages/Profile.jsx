import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import EditProfileModal from "../components/EditProfileModal";
import ShieldIcon from "../components/ui/ShieldIcon";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/**
 * @component Profile
 *
 * Prikazuje podatke o korisniku i omogucava izmenu putem modala.
 *
 * - Dohvata podatke iz Firestore na osnovu ulogovanog korisnika
 * - Prikazuje ime, email, status, datum kreiranja i biografiju
 * - Omogucava izmenu podataka kroz `EditProfileModal`
 *
 * @returns {JSX.Element}
 */

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const isTopContributor = true; // privremeno, samo za test

  // Dohvata podatke o trenutnom korisniku iz Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData({ ...docSnap.data(), id: docSnap.id });
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Lokalno azurira userData nakon izmene
  const updateUserData = (updatedFields) => {
    setUserData((prevData) => ({
      ...prevData,
      ...updatedFields,
    }));
  };

  if (loading) return <p>Loading...</p>;
  if (!userData) return <p>No user data found!</p>;

  // Hardkodovani podaci !!
  const topPosts = [
    {
      id: "abc123",
      title: "Zašto volim React?",
      preview: "Kratka priča o komponentama i strpljenju.",
      image: "https://source.unsplash.com/random/300x200",
      likes: 42,
      badge: "💡",
    },
    {
      id: "def456",
      title: "Kako sam naučio Firebase",
      preview: "Od haosa do harmonije u tri klika.",
      image: "https://source.unsplash.com/random/301x200",
      likes: 38,
      badge: "🔥",
    },
    {
      id: "ghi789",
      title: "CSS nije tako loš… možda.",
      preview: "Borba sa marginama i paddingom.",
      image: "https://source.unsplash.com/random/302x200",
      likes: 31,
      badge: "🔥",
    },
  ];

  return (
    <div className="text-center mb-4">
      <div className="relative inline-block">
        <img
          src={userData.profilePicture}
          alt="Profile pic"
          className={`rounded-full object-cover border-2 border-gray-300 ${
            isTopContributor ? "ring-2 ring-purple-800" : ""
          }`}
          style={{ width: "150px", height: "150px" }}
        />
        {isTopContributor && (
          <ShieldIcon className="absolute -top-2 -right-2 w-6 h-6 text-purple-800" />
        )}
        {isTopContributor && (
          <p className="mt-2 text-sm font-semibold text-purple-800 italic">
            .code-powered
          </p>
        )}
      </div>

      {/* Podaci o korisniku */}
      <div className="row mb-4">
        <div className="col-md-6 text-center text-md-start">
          <h4>{userData.name}</h4>
          <p>{userData.email}</p>
        </div>

        <div className="col-md-6 text-center text-md-end">
          <p>
            Account Created: {userData.createdAt?.toDate().toLocaleString()}
          </p>
          <p>Status: {userData.status}</p>
        </div>
      </div>

      {/* Biografija i izmena */}
      <div className="text-center">
        <p>Bio: {userData.bio}</p>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Edit Profile
        </button>
      </div>

      <EditProfileModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        userData={userData}
        updateUserData={updateUserData}
      />

      <div>
        <h2>Top posts by this author</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {topPosts.map((post) => (
            <div key={post.id} className="bg-white shadow rounded p-4">
              <img
                src={DEFAULT_PROFILE_PICTURE}
                alt={post.title}
                className="w-24 h-24 object-cover rounded-full mx-auto mb-2"
              />
              <h3 className="text-lg font-bold">{post.title}</h3>
              <p className="text-sm text-gray-600">{post.preview}</p>
              <p className="text-sm mt-2">👍 {post.likes}</p>
              {post.badge && <p className="text-2xl">{post.badge}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
