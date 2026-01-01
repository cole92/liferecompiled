import { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaRegLightbulb, FaFire, FaBolt } from "react-icons/fa";
import { Tooltip as ReactTooltip } from "react-tooltip";

import {
  doc,
  getDoc,
  runTransaction,
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

const COOLDOWN_MS = 200;

const ReactionIcon = ({ type, postId, locked, count, onAfterToggle }) => {
  const Icon = iconMap[type];

  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [isActive, setIsActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  // Optimistic count delta (instant UI feedback)
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  const cooldownTimerRef = useRef(null);

  // Keep uid reactive (login/logout)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  const startCooldown = useCallback(() => {
    setIsCoolingDown(true);

    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

    cooldownTimerRef.current = setTimeout(() => {
      setIsCoolingDown(false);
      cooldownTimerRef.current = null;
    }, COOLDOWN_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  // Reset optimistic delta once the parent delivers a new authoritative count
  useEffect(() => {
    setOptimisticDelta(0);
  }, [count]);

  // isActive state via deterministic reaction doc
  const fetchIsActive = useCallback(async () => {
    if (!postId || !type) return;

    if (!uid) {
      setIsActive(false);
      return;
    }

    try {
      const reactionId = buildReactionId(postId, uid, type);
      const reactionRef = doc(db, "reactions", reactionId);
      const snap = await getDoc(reactionRef);
      setIsActive(snap.exists());
    } catch (err) {
      console.error("[ReactionIcon] fetchIsActive failed:", err?.message);
      setIsActive(false);
    }
  }, [postId, type, uid]);

  useEffect(() => {
    fetchIsActive();
  }, [fetchIsActive]);

  const handleClick = async (e) => {
    e.stopPropagation();

    if (!uid) {
      showInfoToast("Please login to react 😊");
      return;
    }

    if (!postId || !type) return;
    if (locked || isToggling || isCoolingDown) return;

    const reactionId = buildReactionId(postId, uid, type);
    const reactionRef = doc(db, "reactions", reactionId);

    setIsToggling(true);

    // For safe rollback on error
    const prevIsActive = isActive;

    try {
      const nextIsActive = await runTransaction(db, async (tx) => {
        const snap = await tx.get(reactionRef);

        if (snap.exists()) {
          tx.delete(reactionRef);
          return false;
        }

        tx.set(reactionRef, {
          postId,
          userId: uid,
          reactionType: type,
          createdAt: serverTimestamp(),
        });

        return true;
      });

      // Update active state
      setIsActive(nextIsActive);

      // Optimistic count bump (instant)
      setOptimisticDelta((d) => d + (nextIsActive ? 1 : -1));

      showInfoToast(
        nextIsActive ? reactionMessages[type] : reactionRemovalMessages[type]
      );

      // Refetch only when toggle succeeded (PostDetails can pull new aggregates)
      if (typeof onAfterToggle === "function") {
        onAfterToggle();
      } else {
        // If no parent refetch, at least resync my active state
        fetchIsActive();
      }
    } catch (err) {
      console.error("[ReactionIcon] toggle failed:", err?.message);
      showInfoToast("Something went wrong. Please try again.");

      // Roll back optimistic state
      setIsActive(prevIsActive);
      // If we optimistically moved, undo it (based on prev->intended)
      // If prev was false and we tried to set true -> undo +1
      // If prev was true and we tried to set false -> undo -1
      setOptimisticDelta((d) => d + (prevIsActive ? 1 : -1));

      // Resync from Firestore to be sure
      fetchIsActive();
    } finally {
      setIsToggling(false);
      startCooldown();
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;
  const disabled = locked || isToggling || isCoolingDown;

  const displayCount = Math.max(0, count + optimisticDelta);

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
        <span style={{ marginLeft: "4px" }}>{displayCount}</span>
      </button>

      <ReactTooltip id={tooltipId} />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,

  // Count dolazi iz post.reactionCounts (backend authoritative)
  count: PropTypes.number.isRequired,

  // PostDetails moze proslediti refetch
  onAfterToggle: PropTypes.func,
};

export default ReactionIcon;
