import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        const docRef = doc(db, "users", uid); 
        const docSnap = await getDoc(docRef); 
        if (docSnap.exists()) {
          setUserData(docSnap.data()); 
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

  if (loading) return <p>Loading...</p>;

  if (!userData) return <p>No user data found!</p>;

  return (
    <div className="container mt-4">
      {/* Gornji deo: Profilna slika centrirana */}
      <div className="text-center mb-4">
        <img
          src="https://via.placeholder.com/150"
          alt="Profile pic"
          className="rounded-circle"
          style={{ width: "150px", height: "150px" }}
        />
      </div>

      {/* Srednji deo: Dva stupca - Levo i Desno */}
      <div className="row mb-4">
        {/* Leva sekcija */}
        <div className="col-md-6 text-center text-md-start">
          <h4>{userData.name}</h4>
          <p>{userData.email}</p>
        </div>

        {/* Desna sekcija */}
        <div className="col-md-6 text-center text-md-end">
          <p>Account Created: {userData.createdAt?.toDate().toLocaleString()}</p>
          <p>Status: {userData.status}</p>
        </div>
      </div>

      {/* Donji deo: Biografija i dugme */}
      <div className="text-center">
        <p>
          Bio: {userData.bio}
        </p>
        <button className="btn btn-primary">Edit Profile</button>
      </div>
    </div>
  );
};

export default Profile;
