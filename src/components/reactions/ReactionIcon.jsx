import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FaRegLightbulb, FaFire, FaBolt } from "react-icons/fa";
import { Tooltip as ReactTooltip } from "react-tooltip";

import {
  doc,
  setDoc,
  getDocs,
  query,
  collection,
  where,
  deleteDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";

import { showInfoToast } from "../../utils/toastUtils";

/**
 * @component ReactionIcon
 * Prikazuje dugme za reakciju (💡 idea, 🔥 hot, ⚡ powerup) sa brojacem i klik interakcijom.
 *
 * @param {("idea"|"hot"|"powerup")} type - Tip reakcije (odredjuje ikonicu).
 * @param {string} postId - ID posta na koji se reakcija odnosi.
 * @param {boolean} [locked] - Ako je post zakljucan, onemogucava klik na reakciju.
 *
 * @returns {JSX.Element} Reakciono dugme sa ikonicom i brojem.
 */

const iconMap = {
  idea: FaRegLightbulb,
  hot: FaFire,
  powerup: FaBolt,
};

const ReactionIcon = ({ type, postId, locked }) => {
  const Icon = iconMap[type];
  const [count, setCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!postId || !type) return;

    const fetchReactions = async () => {
      const q = query(
        collection(db, "reactions"),
        where("postId", "==", postId),
        where("reactionType", "==", type)
      );

      const snapshot = await getDocs(q);
      let currentCount = 0;
      let userHasReacted = false;

      // Broji reakcije i proverava da li je trenutni korisnik reagovao
      snapshot.forEach((doc) => {
        currentCount++;
        if (doc.data().userId === auth.currentUser?.uid) {
          userHasReacted = true;
        }
      });

      setCount(currentCount);
      setIsActive(userHasReacted);
    };

    fetchReactions();
  }, [postId, type]);

  const handleClick = async (e) => {
    e.stopPropagation();

    if (!auth.currentUser) {
      showInfoToast("Please login to react 😊");
      return;
    }
    
    if (locked) return;

    const userId = auth.currentUser.uid;

    // Proverava da li korisnik vec ima istu reakciju
    const q = query(
      collection(db, "reactions"),
      where("postId", "==", postId),
      where("userId", "==", userId),
      where("reactionType", "==", type)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      // Ako postoji, brise reakciju
      await deleteDoc(doc(db, "reactions", snapshot.docs[0].id));
      setIsActive(false);
      setCount((prev) => prev - 1);
      showInfoToast(reactionRemovalMessages[type]);
    } else {
      // Ako ne postoji, dodaje novu reakciju
      const newRef = doc(collection(db, "reactions"));
      await setDoc(newRef, {
        postId,
        userId,
        reactionType: type,
        createdAt: new Date(),
      });
      setIsActive(true);
      setCount((prev) => prev + 1);

      showInfoToast(reactionMessages[type]);
    }
  };

  // Tekstualni opisi za tooltip prikaz ispod svake reakcije
  const reactionLabels = {
    idea: "💡 Idea — This post inspired you.",
    hot: "🔥 Hot — This post is popular or trending.",
    powerup: "⚡ Powerup — Show support for the author.",
  };

  const reactionMessages = {
    idea: "💡 Inspired by this post? Great minds think alike!",
    hot: "🔥 Marked as Hot — this post is on fire!",
    powerup: "⚡ You just boosted the author's motivation!",
  };

  const reactionRemovalMessages = {
    idea: "💡 Not feeling inspired anymore? :( ",
    hot: "🔥  Cooled off a bit, huh?",
    powerup: "⚡ Took back your Powerup — oh wow, thanks a lot. 🙃",
  };

  return (
    <>
      {/* Dugme za reakciju sa tooltipom; koristi `react-tooltip@v5` */}
      <button
        onClick={handleClick}
        className={`reaction-button ${isActive ? "active" : ""}`}
        data-tooltip-id={`tooltip-${type}-${postId}`}
        data-tooltip-content={reactionLabels[type]}
      >
        <Icon />
        <span style={{ marginLeft: "4px" }}>{count}</span>
      </button>
      <ReactTooltip id={`tooltip-${type}-${postId}`} position="" />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
};

export default ReactionIcon;
