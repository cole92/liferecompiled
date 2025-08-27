import { useEffect, useState } from "react";
import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import ShieldIcon from "../components/ui/ShieldIcon";
import BioSection from "../components/profile/BioSection";
import StatsRow from "../components/profile/StatsRow";
import { useParams } from "react-router-dom";
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
  const [postCount, setPostsCount] = useState(null);
  const [isCounting, setIsCounting] = useState(false);
  const [reactionsCount, setReactionsCount] = useState(null);
  const [isCountingReactions, setIsCountingReactions] = useState(false);
  const [isLoadingTop3, setIsLoadingTop3] = useState(false);
  const [top3, setTop3] = useState([]);
  const [errorTop3, setErrorTop3] = useState(null);
  const isTopContributor = true; // privremeno, samo za test

  const auth = getAuth();
  const ownUid = auth.currentUser?.uid || null;
  const { uid } = useParams();
  const targetUid = uid || ownUid;
  // const isOwn = targetUid === ownUid;   // za buduci Edit profile, ako se odlucim da bude i ovde!

  // Dohvata podatke o trenutnom korisniku iz Firestore
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", targetUid);
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
  }, [targetUid]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      // Ako nema targetUid (gost otvorio /profile) – nema šta da brojimo
      if (!targetUid) {
        setPostsCount(0);
        setIsCounting(false);
        return;
      }
      setIsCounting(true);

      try {
        const postsCol = collection(db, "posts");
        const q = query(
          postsCol,
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );
        const snap = await getCountFromServer(q);

        if (!cancelled) {
          setPostsCount(snap.data().count || 0);
        }
      } catch (err) {
        console.error("Count failed", err);
        if (!cancelled) setPostsCount(0);
      } finally {
        if (!cancelled) setIsCounting(false);
      }
    }

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  // Reactions
  useEffect(() => {
    let cancelled = false;

    async function fetchReactionsReceived() {
      if (!targetUid) {
        setIsCountingReactions(false);
        setReactionsCount(0);
        return;
      }
      setIsCountingReactions(true);

      try {
        const postQ = query(
          collection(db, "posts"),
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );
        const postSnap = await getDocs(postQ);
        const postIds = postSnap.docs.map((d) => d.id);

        if (postIds.length === 0) {
          if (!cancelled) setReactionsCount(0);
          return;
        }

        const chunkSize = 10;
        let total = 0;

        for (let i = 0; i < postIds.length; i += chunkSize) {
          const chunk = postIds.slice(i, i + chunkSize);

          const reactionsQ = query(
            collection(db, "reactions"),
            where("postId", "in", chunk)
          );
          const snap = await getCountFromServer(reactionsQ);
          total += snap.data().count || 0;
        }
        if (!cancelled) setReactionsCount(total);
      } catch (err) {
        console.error("Reactions count failed", err);
        if (!cancelled) setReactionsCount(0);
      } finally {
        if (!cancelled) setIsCountingReactions(false);
      }
    }

    fetchReactionsReceived();
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  // top 3

  useEffect(() => {
    let cancelled = false;

    async function fetchTop3() {
      if (!targetUid) {
        setIsLoadingTop3(false);
        setTop3([]);
        return;
      }
      setIsLoadingTop3(true);
      setErrorTop3(null);

      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", targetUid),
          where("deleted", "==", false)
        );
        const postSnap = await getDocs(postsQuery);
        const postIds = postSnap.docs.map((doc) => doc.id);

        console.log("postIds count:", postIds.length, postIds);

        if (postIds.length === 0) {
          if (!cancelled) setTop3([]);
          return;
        }

        // const firstId = postIds[0];
        // if (firstId) {
        //   const reactionsQ = query(
        //     collection(db, "reactions"),
        //     where("postId", "==", firstId)
        //   );

        //   const qSnap = await getCountFromServer(reactionsQ);
        //   const count = qSnap.data().count || 0;
        //   console.log("test COUNT for firstId =",firstId, ">", count  );

        // }

        const counts = {};

        for (const postId of postIds) {
          //svaki post zasebno ?
          const reactionsQ = query(
            collection(db, "reactions"),
            where("postId", "==", postId) // vrati svaku reakciju vezanu za dati post?
          );
          const reactionsSnap = await getCountFromServer(reactionsQ);
          counts[postId] = reactionsSnap.data().count || 0;
        }
        console.log("counts =", counts);

        const entries = Object.entries(counts);
        console.log(entries, "entries");

        const pairs = entries.map(([postId, count]) => ({ postId, count }));
        pairs.sort((a, b) => b.count - a.count);
        console.log(pairs);

        const top3Pairs = pairs.slice(0, 3);
        console.log("top3Pairs =", top3Pairs);

        const top3Ids = top3Pairs.map((p) => p.postId);
        console.log("top3Ids", top3Ids);

        if (top3Ids.length === 0) {
          if (!cancelled) setTop3([]);
          return;
        }

        const postq = query(collection(db, "posts"),
        where(documentId(), "in", top3Ids)
        );

        const postsSnap = await getDocs(postq);

        let topPosts = postSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          reactionsCount:counts[d.id] ?? 0
        }));
        
      } catch (err) {
        console.log(err);
        setErrorTop3(err.message ?? "Top3 failed");
      } finally {
        setIsLoadingTop3(false);
      }
    }
    fetchTop3();
  }, [targetUid]);

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
        <h5>Bio:</h5>
        <BioSection bio={userData.bio} />
      </div>

      <StatsRow
        posts={isCounting || postCount == null ? 0 : postCount}
        reactions={
          isCountingReactions || reactionsCount == null ? 0 : reactionsCount
        }
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
