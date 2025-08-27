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
import Spinner from "../components/Spinner";

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

        if (postIds.length === 0) {
          if (!cancelled) setTop3([]);
          return;
        }

        const counts = {};

        for (const postId of postIds) {
          const reactionsQ = query(
            collection(db, "reactions"),
            where("postId", "==", postId)
          );
          const reactionsSnap = await getCountFromServer(reactionsQ);
          counts[postId] = reactionsSnap.data().count || 0;
        }

        const entries = Object.entries(counts);

        const pairs = entries.map(([postId, count]) => ({ postId, count }));
        pairs.sort((a, b) => b.count - a.count);

        const top3Pairs = pairs.slice(0, 3);

        const top3Ids = top3Pairs.map((p) => p.postId);

        if (top3Ids.length === 0) {
          if (!cancelled) setTop3([]);
          return;
        }

        const postq = query(
          collection(db, "posts"),
          where(documentId(), "in", top3Ids)
        );

        const postsSnap = await getDocs(postq);

        let topPosts = postsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          reactionsCount: counts[d.id] ?? 0,
        }));

        topPosts.sort((a, b) => b.reactionsCount - a.reactionsCount);

        setTop3(topPosts);
      } catch (err) {
        console.log(err);
        setErrorTop3(err.message ?? "Top3 failed");
      } finally {
        setIsLoadingTop3(false);
      }
    }

    fetchTop3();
  }, [targetUid]);

  console.log(top3, "State");

  if (loading) return <p>Loading...</p>;
  if (!userData) return <p>No user data found!</p>;

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
        <h2 className="text-xl font-semibold mb-4">Top posts by this author</h2>

        {/* Loading */}
        {isLoadingTop3 && <Spinner message="Loading posts..." />}

        {/* Error */}
        {errorTop3 && <p className="text-red-500">{errorTop3}</p>}

        {/* Empty state */}
        {!isLoadingTop3 && !errorTop3 && top3.length === 0 && (
          <p>No top posts yet.</p>
        )}

        {/* Render posts */}
        {!isLoadingTop3 && !errorTop3 && top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {top3.map((post) => {
              // Fallback za description → ako ga nema, koristi content ili “No description”
              const previewText =
                post.description?.trim() ||
                (post.content
                  ? post.content.slice(0, 120) +
                    (post.content.length > 120 ? "..." : "")
                  : "No description");

              // Tagovi → prikaži max 3
              const tagList = (post.tags || [])
                .slice(0, 3)
                .map((t) =>
                  typeof t === "string" ? t : t.text || t.name || "tag"
                )
                .join(" • ");

              return (
                <div key={post.id} className="bg-white shadow rounded p-4">
                  <h3 className="text-lg font-bold">{post.title}</h3>
                  <p className="text-sm text-gray-600">{previewText}</p>

                  <div className="mt-2 text-xs text-gray-500">
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 mr-2">
                      {post.category}
                    </span>
                    {tagList && (
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5">
                        {tagList}
                      </span>
                    )}
                  </div>

                  <p className="text-sm mt-3">👍 {post.reactionsCount}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
