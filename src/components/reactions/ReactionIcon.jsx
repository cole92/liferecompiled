import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { FaRegLightbulb, FaFire, FaBolt } from "react-icons/fa";
import { Tooltip as ReactTooltip } from "react-tooltip";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase";
import { showInfoToast } from "../../utils/toastUtils";

const iconMap = {
  idea: FaRegLightbulb,
  hot: FaFire,
  powerup: FaBolt,
};

// Deterministic reaction doc id: postId__userId__reactionType
const buildReactionId = (postId, userId, type) =>
  `${postId}__${userId}__${type}`;

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
  hot: "🔥 Cooled off a bit, huh?",
  powerup: "⚡ Took back your Powerup — oh wow, thanks a lot. 🙃",
};

const ReactionIcon = ({ type, postId, locked }) => {
  const Icon = iconMap[type];

  const [count, setCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

  // Keep uid reactive (login/logout should update active state)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // Count (temporary: still reading from reactions event-log)
  const fetchCount = useCallback(async () => {
    if (!postId || !type) return;

    setIsLoading(true);
    try {
      const q = query(
        collection(db, "reactions"),
        where("postId", "==", postId),
        where("reactionType", "==", type)
      );

      const snapshot = await getDocs(q);
      setCount(snapshot.size);
    } catch (err) {
      console.error("[ReactionIcon] fetchCount failed:", err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [postId, type]);

  // Active state via deterministic doc id
  const fetchIsActive = useCallback(async () => {
    if (!postId || !type) return;

    if (!uid) {
      setIsActive(false);
      return;
    }

    try {
      const reactionId = buildReactionId(postId, uid, type);
      const reactionRef = doc(db, "reactions", reactionId);
      const mySnap = await getDoc(reactionRef);

      setIsActive(mySnap.exists());
    } catch (err) {
      console.error("[ReactionIcon] fetchIsActive failed:", err?.message);
      setIsActive(false);
    }
  }, [postId, type, uid]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    fetchIsActive();
  }, [fetchIsActive]);

  const handleClick = async (e) => {
    e.stopPropagation();

    if (!uid) {
      showInfoToast("Please login to react 😊");
      return;
    }

    if (locked || isToggling) return;

    const reactionId = buildReactionId(postId, uid, type);
    const reactionRef = doc(db, "reactions", reactionId);

    setIsToggling(true);

    const prevActive = isActive;
    const prevCount = count;

    try {
      const snap = await getDoc(reactionRef);

      if (snap.exists()) {
        // Toggle off
        await deleteDoc(reactionRef);

        setIsActive(false);
        setCount((c) => Math.max(0, c - 1));
        showInfoToast(reactionRemovalMessages[type]);
      } else {
        // Toggle on
        await setDoc(reactionRef, {
          postId,
          userId: uid,
          reactionType: type,
          createdAt: serverTimestamp(),
        });

        setIsActive(true);
        setCount((c) => c + 1);
        showInfoToast(reactionMessages[type]);
      }
    } catch (err) {
      console.error("[ReactionIcon] toggle failed:", err?.message);

      // Roll back local optimistic state
      setIsActive(prevActive);
      setCount(prevCount);

      showInfoToast("Something went wrong. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;
  const disabled = locked || isToggling;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        aria-pressed={isActive}
        className={`reaction-button ${isActive ? "active" : ""} ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
        data-tooltip-id={tooltipId}
        data-tooltip-content={reactionLabels[type]}
      >
        <Icon />
        <span style={{ marginLeft: "4px" }}>
          {isLoading ? (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin align-[-2px]"
              aria-label="Loading"
              title="Loading"
            />
          ) : (
            count
          )}
        </span>
      </button>

      <ReactTooltip id={tooltipId} position="" />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
};

export default ReactionIcon;
