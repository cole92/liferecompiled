import { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FaRegLightbulb, FaFire, FaBolt } from "react-icons/fa";
import { Tooltip as ReactTooltip } from "react-tooltip";

import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
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

const ReactionIcon = ({ type, postId, locked }) => {
  const Icon = iconMap[type];

  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

  const [count, setCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const [isCountLoading, setIsCountLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  const cooldownTimerRef = useRef(null);

  // Keep uid reactive (login/logout should update active state)
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

  // Count (temporary: still reading from reactions event-log)
  const fetchCount = useCallback(async () => {
    if (!postId || !type) return;

    setIsCountLoading(true);
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
      setIsCountLoading(false);
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

  // Initial/refresh fetch: run both without flicker loops
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!postId || !type) return;

      try {
        await Promise.all([fetchCount(), fetchIsActive()]);
      } finally {
        // no-op, each function handles its own state
      }
    })();

    return () => {
      alive = false;
      void alive;
    };
  }, [postId, type, fetchCount, fetchIsActive]);

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

    const prevActive = isActive;
    const prevCount = count;

    try {
      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(reactionRef);

        if (snap.exists()) {
          // Toggle off
          tx.delete(reactionRef);
          return { nextActive: false, delta: -1 };
        }

        // Toggle on
        tx.set(reactionRef, {
          postId,
          userId: uid,
          reactionType: type,
          createdAt: serverTimestamp(),
        });

        return { nextActive: true, delta: +1 };
      });

      setIsActive(result.nextActive);
      setCount((c) => Math.max(0, c + result.delta));

      showInfoToast(
        result.nextActive
          ? reactionMessages[type]
          : reactionRemovalMessages[type]
      );
    } catch (err) {
      console.error("[ReactionIcon] toggle failed:", err?.message);

      // Roll back local state
      setIsActive(prevActive);
      setCount(prevCount);

      showInfoToast("Something went wrong. Please try again.");
    } finally {
      setIsToggling(false);
      startCooldown();

      // Optional: soft resync (helps if another tab/user changed stuff)
      // Not required for MVP; you can keep it or remove it later.
      setTimeout(() => {
        fetchIsActive();
        fetchCount();
      }, 250);
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;

  // Keep button clickable when logged out (so it can show the login toast)
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
        <span style={{ marginLeft: "4px" }}>
          {isCountLoading ? (
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

      <ReactTooltip id={tooltipId} />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
};

export default ReactionIcon;
