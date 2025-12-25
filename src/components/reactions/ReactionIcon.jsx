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

const COOLDOWN_MS = 600;

const ReactionIcon = ({ type, postId, locked, count, onAfterToggle }) => {
  const Icon = iconMap[type];

  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [isActive, setIsActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

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

    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }

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

    let didToggleSucceed = false;

    try {
      const result = await runTransaction(db, async (tx) => {
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

      didToggleSucceed = true;
      setIsActive(result);

      showInfoToast(
        result ? reactionMessages[type] : reactionRemovalMessages[type]
      );

      // MVP: refetch only when toggle succeeded
      if (typeof onAfterToggle === "function") {
        onAfterToggle();
      } else {
        fetchIsActive();
      }
    } catch (err) {
      console.error("[ReactionIcon] toggle failed:", err?.message);
      showInfoToast("Something went wrong. Please try again.");

      // Optional: keep isActive in sync after failure
      if (!didToggleSucceed) {
        fetchIsActive();
      }
    } finally {
      setIsToggling(false);
      startCooldown();
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;
  const disabled = locked || isToggling || isCoolingDown;

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
        <span style={{ marginLeft: "4px" }}>{count}</span>
      </button>

      <ReactTooltip id={tooltipId} />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,

  // MVP: count dolazi iz post.reactionCounts
  count: PropTypes.number.isRequired,

  // PostDetails moze proslediti refetch
  onAfterToggle: PropTypes.func,
};

export default ReactionIcon;
