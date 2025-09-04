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
import TopPostCard from "../components/TopPostCard";
import SkeletonGrid from "../components/ui/skeletonLoader/SkeletonGrid";
import dayjs from "dayjs";
import {
  SkeletonCircle,
  SkeletonLine,
} from "../components/ui/skeletonLoader/SkeletonBits";

/**
 * @component Profile
 *
 * Prikaz javnog ili sopstvenog profila korisnika uz osnovne metrike.
 *
 * - Dohvata user dokument iz Firestore na osnovu uid-a
 * - Prikazuje ime, email, status, datum kreiranja i bio
 * - Racuna broj postova i ukupan broj reakcija
 * - Prikazuje Top 3 posta korisnika po broju reakcija
 * - UX: tokom loading-a prikazuje skeleton za avatar, ime/email i bio
 * - Datum "Member since" formatiran preko dayjs (DD MMMM 'YYYY)
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

  // DEV-ONLY: hardcode badge za vizuelni test
  const isTopContributor = true;

  const auth = getAuth();
  const ownUid = auth.currentUser?.uid || null;
  const { uid } = useParams();
  const targetUid = uid || ownUid;

  // Dohvati user dokument
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

  // Broj aktivnih postova
  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
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

  // Ukupan broj reakcija na sve postove korisnika
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

        // Chunk pristup zbog Firestore limita (max 10 ID-ova u "in" query)
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

  // Top 3 posta po broju reakcija
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

        // Racunaj broj reakcija za svaki post
        const counts = {};
        for (const postId of postIds) {
          const reactionsQ = query(
            collection(db, "reactions"),
            where("postId", "==", postId)
          );
          const reactionsSnap = await getCountFromServer(reactionsQ);
          counts[postId] = reactionsSnap.data().count || 0;
        }

        // Odredi top 3 ID-a po count-u
        const pairs = Object.entries(counts).map(([postId, count]) => ({
          postId,
          count,
        }));
        pairs.sort((a, b) => b.count - a.count);

        const top3Ids = pairs.slice(0, 3).map((p) => p.postId);

        if (top3Ids.length === 0) {
          if (!cancelled) setTop3([]);
          return;
        }

        // Dohvati detalje za top 3 posta
        const postq = query(
          collection(db, "posts"),
          where(documentId(), "in", top3Ids)
        );
        const postsSnap = await getDocs(postq);

        const topPosts = postsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          reactionsCount: counts[d.id] ?? 0,
        }));

        // Ponovo sortiraj prema broju reakcija
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

  if (!loading && !userData) return <p>No user data found!</p>;

  return (
    <div className="text-center mb-4">
      {/* HEADER: avatar + badge / oznaka */}
      <div className="relative inline-block">
        {loading ? (
          <SkeletonCircle size={150} />
        ) : (
          <img
            src={userData.profilePicture}
            alt="Profile pic"
            className={`rounded-full object-cover border-2 border-gray-300 ${
              isTopContributor ? "ring-2 ring-purple-800" : ""
            }`}
            style={{ width: "150px", height: "150px" }}
          />
        )}

        {/* Badge i .code-powered tek kad imamo podatke (da ne "skace") */}
        {!loading && isTopContributor && (
          <>
            <ShieldIcon className="absolute -top-2 -right-2 w-6 h-6 text-purple-800" />
            <p
              className="mt-2 text-sm font-semibold text-purple-800 italic cursor-default select-none"
              title="Built with code ? (Placeholder dok ne smislimo tekst!)"
            >
              .code-powered
            </p>
          </>
        )}
      </div>

      {/* OSNOVNI PODACI: ime/email levo, member since/status desno */}
      <div className="row mb-4 mt-4">
        <div className="col-md-6 text-center text-md-start">
          {loading ? (
            <>
              <div className="mt-2">
                <SkeletonLine w="w-48" h="h-6" />
              </div>
              <div className="mt-2">
                <SkeletonLine w="w-56" h="h-4" />
              </div>
            </>
          ) : (
            <>
              <h4>{userData.name}</h4>
              <p>{userData.email}</p>
            </>
          )}
        </div>

        <div className="col-md-6 text-center text-md-end">
          {loading ? (
            <>
              <div className="mt-2">
                <SkeletonLine w="w-64" h="h-4" />
              </div>
              <div className="mt-2">
                <SkeletonLine w="w-32" h="h-4" />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 italic cursor-default select-none">
                Member since:{" "}
                {userData.createdAt
                  ? dayjs(userData.createdAt.toDate()).format("DD MMMM 'YYYY")
                  : "---"}
              </p>
              <p className="cursor-default select-none">
                Status: {userData.status}
              </p>
            </>
          )}
        </div>
      </div>

      {/* BIO */}
      <div className="text-center">
        <h5 className="cursor-default select-none">Bio:</h5>
        {loading ? (
          <div className="mx-auto mt-2 space-y-2 max-w-xl">
            <SkeletonLine w="w-full" h="h-4" />
            <SkeletonLine w="w-5/6" h="h-4" />
            <SkeletonLine w="w-2/3" h="h-4" />
          </div>
        ) : (
          <BioSection bio={userData.bio} />
        )}
      </div>

      {/* STATS */}
      <StatsRow
        posts={postCount}
        reactions={reactionsCount}
        loadingPosts={isCounting || postCount == null}
        loadingReactions={isCountingReactions || reactionsCount == null}
      />

      {/* TOP 3 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 cursor-default select-none">
          Top posts by this author
        </h2>

        {isLoadingTop3 && <SkeletonGrid count={3} />}
        {errorTop3 && <p className="text-red-500">{String(errorTop3)}</p>}
        {!isLoadingTop3 && !errorTop3 && top3.length === 0 && (
          <p>This author has no public posts yet.</p>
        )}
        {!isLoadingTop3 && !errorTop3 && top3.length > 0 && (
          <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {top3.map((post) => (
              <TopPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
