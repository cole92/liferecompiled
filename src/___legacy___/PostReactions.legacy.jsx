import Spinner from "./Spinner";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FaRegLightbulb, FaFire, FaBolt } from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

/**
 * ⚠️ Legacy komponenta
 * Ova komponenta je zamenjena novom ReactionSummary komponentom.
 * Ostavljena je ovde za referencu i ne koristi se više u aplikaciji.
 */

/**
 * Komponenta za prikaz i upravljanje reakcijama na post.
 *
 * - Prikazuje sve dostupne reakcije uz broj glasova
 * - Dozvoljava korisniku da klikne ili ukloni svoju reakciju
 * - Real-time azuriranje putem Firestore onSnapshot
 * - Ako je `locked`, onemogucava sve interakcije
 *
 * @component
 * @param {string} postId - ID posta za koji se prikazuju reakcije
 * @param {boolean} [locked=false] - Da li je post zakljucan (onemogucava klik)
 */

// Komponenta koja upravlja reakcijama na postove
const PostReactions = ({ postId, locked }) => {
  /**
   * State za pracenje korisnickih reakcija (da li je korisnik kliknuo na neku reakciju).
   * Popunjava se nakon sto ucitamo podatke iz Firestore-a putem `onSnapshot()`.
   */

  const [userReactions, setUserReactions] = useState({
    idea: false,
    hot: false,
    powerup: false,
  });

  /**
   * State za brojanje reakcija po tipu.
   * Pocetno stanje je 0 za svaku reakciju, ali se azurira iz Firestore-a.
   */
  const [reactionCounts, setReactionCounts] = useState({
    idea: 0,
    hot: 0,
    powerup: 0,
  });

  /**
   * Mapa koja povezuje naziv reakcije sa odgovarajucom ikonicom.
   * Ovo omogucava dinamicko prikazivanje odgovarajuce ikonice u UI-u.
   */
  const reactionComponents = {
    idea: FaRegLightbulb,
    hot: FaFire,
    powerup: FaBolt,
  };
  // State za pracnje ucitavanja
  const [isLoading, setIsLoading] = useState(true);

  /**
   * `useEffect` slusa promene u Firestore-u i azurira UI u realnom vremenu.
   * Kada se komponenta mount-uje ili `postId` promeni, preuzimamo reakcije iz Firestore-a.
   * Koristimo `onSnapshot()` da slusamo promene u bazi (real-time update).
   */
  useEffect(() => {
    if (!postId) return; // Ako postId ne postoji, ne radimo nista.

    // Kreiramo upit za sve reakcije koje pripadaju ovom postId
    const q = query(collection(db, "reactions"), where("postId", "==", postId));

    // Pretplacujemo se na real-time azuriranja
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Resetujemo brojace i korisnicke reakcije pre nego sto ih azuriramo
      const newCounts = {
        idea: 0,
        hot: 0,
        powerup: 0,
      };
      const newUserReactions = {
        idea: false,
        hot: false,
        powerup: false,
      };
      // Prolazimo kroz sve dokumente u snapshot-u i racunamo reakcije
      snapshot.forEach((doc) => {
        const data = doc.data();
        const rType = data.reactionType;

        // Ako postoji validna reakcija, povecavamo njen brojac
        if (newCounts[rType] !== undefined) {
          newCounts[rType]++;
        }

        // Ako je reakciju dodao trenutno prijavljeni korisnik, oznacavamo je
        if (data.userId === auth.currentUser?.uid) {
          newUserReactions[rType] = true;
        }
      });

      // Azuriramo state sa najnovijim podacima iz Firestore-a
      setReactionCounts(newCounts);
      setUserReactions(newUserReactions);
      setIsLoading(false); // Podaci su stigli, prekidamo loading
    });

    // Cleanup funkcija – prekidamo pretplatu kada se komponenta unmount-uje ili `postId` promeni
    return () => unsubscribe();
  }, [postId]);

  /**
   * Funkcija koja se poziva kada korisnik klikne na reakciju.
   * Ako je reakcija vec dodata, brisemo je iz Firestore-a.
   * Ako reakcija ne postoji, dodajemo novi dokument u Firestore.
   */

  const handleReactionClick = async (event, reactionType) => {
    event.stopPropagation(); // Sprecava prebacivanje na stranicu posta pri kliku

    if (!auth.currentUser) return; // Ako korisnik nije prijavljen, ne dozvoljavamo reakciju
    const userId = auth.currentUser.uid;

    if (locked) return; // Ako je post zaklucan ne izvrsavaj reakciju

    try {
      // Proveravamo da li korisnik vec ima ovu reakciju
      const q = query(
        collection(db, "reactions"),
        where("postId", "==", postId),
        where("userId", "==", userId),
        where("reactionType", "==", reactionType)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Ako reakcija vec postoji, brisemo je
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, "reactions", docId));
      } else {
        // Ako reakcija ne postoji, dodajemo novi dokument
        const newDocRef = doc(collection(db, "reactions"));
        await setDoc(newDocRef, {
          postId: postId,
          userId: userId,
          reactionType: reactionType,
          createdAt: new Date(),
        });
      }
      // `onSnapshot()` ce automatski azurirati state, pa ne moramo rucno menjati `useState`.
    } catch (error) {
      console.error("Greska pri azuriranju reakcije:", error);
    }
  };

  return (
    <div className="post-reactions">
      <div className="reactions-container">
        {Object.entries(reactionCounts).map(([reactionType, count]) => {
          const IconComponent = reactionComponents[reactionType];
          const isActive = userReactions[reactionType];

          return (
            <button
              key={reactionType}
              onClick={(event) => {
                if (locked) return;
                handleReactionClick(event, reactionType);
              }}
              className={`reaction-button ${isActive ? "active" : ""}`}
              style={{ fontSize: "1.2rem", padding: "10px 15px" }}
            >
              <IconComponent className="reaction-icon" />
              {isLoading ? (
                <Spinner
                  style={{
                    width: "25px",
                    height: "15px",
                    borderWidth: "2px",
                    borderColor: "red",
                  }}
                  message=""
                />
              ) : (
                count
              )}{" "}
              {/* Prikazuje spinner dok se podaci ucitavaju */}
            </button>
          );
        })}
      </div>
    </div>
  );
};

PostReactions.propTypes = {
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
};

export default PostReactions;
