import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { showInfoToast, showErrorToast } from "../../utils/toastUtils";

const iconMap = {
  idea: FaRegLightbulb,
  hot: FaFire,
  powerup: FaBolt,
};

const typeActiveText = {
  idea: "text-amber-200",
  hot: "text-rose-400",
  powerup: "text-sky-200",
};

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

// Global toast ids to prevent queue spam
const REACT_AUTH_TOAST_ID = "react:auth";
const REACT_STATUS_TOAST_ID = "react:status";
const REACT_ERROR_TOAST_ID = "react:error";

// Deterministic reaction doc id: postId__userId__reactionType
const buildReactionId = (postId, userId, type) =>
  `${postId}__${userId}__${type}`;

const ReactionIcon = ({
  type,
  postId,
  locked,
  count,
  onAfterToggle,
  userId,
  fetchActiveOnMount = true,
}) => {
  const Icon = iconMap[type];

  const [uid, setUid] = useState(userId ?? auth.currentUser?.uid ?? null);
  const [isActive, setIsActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  // Optimistic count delta (instant UI feedback)
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  const cooldownTimerRef = useRef(null);

  // If parent provides userId, use it and do NOT attach per-icon auth listener
  useEffect(() => {
    if (typeof userId !== "undefined") {
      setUid(userId ?? null);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof userId !== "undefined") return;

    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });

    return () => unsub();
  }, [userId]);

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

  // Default behavior: fetch active state on mount
  useEffect(() => {
    if (!fetchActiveOnMount) return;
    fetchIsActive();
  }, [fetchActiveOnMount, fetchIsActive]);

  const handleClick = async (e) => {
    e.stopPropagation();

    if (!uid) {
      showInfoToast("Please login to react 😊", {
        toastId: REACT_AUTH_TOAST_ID,
      });
      return;
    }

    if (!postId || !type) return;
    if (locked || isToggling || isCoolingDown) return;

    const reactionId = buildReactionId(postId, uid, type);
    const reactionRef = doc(db, "reactions", reactionId);

    setIsToggling(true);

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

      setIsActive(nextIsActive);
      setOptimisticDelta((d) => d + (nextIsActive ? 1 : -1));

      showInfoToast(
        nextIsActive ? reactionMessages[type] : reactionRemovalMessages[type],
        { toastId: REACT_STATUS_TOAST_ID, autoClose: 1200 },
      );

      if (typeof onAfterToggle === "function") {
        onAfterToggle();
      } else if (fetchActiveOnMount) {
        fetchIsActive();
      }
    } catch (err) {
      console.error("[ReactionIcon] toggle failed:", err?.message);

      showErrorToast("Something went wrong. Please try again.", {
        toastId: REACT_ERROR_TOAST_ID,
      });

      // revert local UI state
      setIsActive(prevIsActive);
      setOptimisticDelta(0);

      if (fetchActiveOnMount) fetchIsActive();
    } finally {
      setIsToggling(false);
      startCooldown();
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;
  const disabled = locked || isToggling || isCoolingDown;

  const displayCount = Math.max(0, count + optimisticDelta);
  const activeText = typeActiveText[type];

  const baseClass = useMemo(() => {
    const common =
      "reaction-button inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs " +
      "transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
      "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 " +
      "hover:bg-zinc-900/40";

    const state = isActive
      ? `bg-zinc-900/30 ring-1 ring-zinc-700/60 ${activeText}`
      : `bg-transparent ${activeText}`;

    const dis = disabled
      ? "opacity-60 cursor-not-allowed hover:bg-transparent"
      : "cursor-pointer";

    // Powerup slightly "special" but still subtle
    const powerupAccent =
      type === "powerup" ? " ring-1 ring-sky-500/15 bg-sky-500/5" : "";

    return `${common} ${state} ${dis}${isActive ? powerupAccent : ""}`;
  }, [disabled, isActive, activeText, type]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        aria-pressed={isActive}
        className={baseClass}
        data-tooltip-id={tooltipId}
        data-tooltip-content={reactionLabels[type]}
      >
        <Icon className="h-4 w-4" />
        <span className="tabular-nums">{displayCount}</span>
      </button>

      <ReactTooltip id={tooltipId} />
    </>
  );
};

ReactionIcon.propTypes = {
  type: PropTypes.oneOf(["idea", "hot", "powerup"]).isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
  count: PropTypes.number.isRequired,
  onAfterToggle: PropTypes.func,

  // Optional: pass from parent to avoid per-icon auth subscription
  userId: PropTypes.string,

  // Optional: set false in Home list to avoid per-icon getDoc on mount
  fetchActiveOnMount: PropTypes.bool,
};

export default ReactionIcon;
