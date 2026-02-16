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

const COOLDOWN_MS = 200;

// toast ids
const REACT_AUTH_TOAST_ID = "react:auth";
const REACT_ERROR_TOAST_ID = "react:error";
const REACT_HELP_TOAST_ID = "react:help";
const REACT_HELP_THROTTLE_MS = 1200;

// throttle memory (module-scope)
const lastToastAt = new Map();

function canShowToast(id) {
  const now = Date.now();
  const last = lastToastAt.get(id) ?? 0;
  if (now - last < REACT_HELP_THROTTLE_MS) return false;
  lastToastAt.set(id, now);
  return true;
}

function hasSeenHelp(type) {
  try {
    return sessionStorage.getItem(`reactHelp:${type}`) === "1";
  } catch {
    return false;
  }
}

function markSeenHelp(type) {
  try {
    sessionStorage.setItem(`reactHelp:${type}`, "1");
  } catch {
    // ignore
  }
}

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

  // NEW
  disabled = false, // "soft block" (e.g. self powerup)
  onBlockedClick,
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

  const hardDisabled = locked || isToggling || isCoolingDown; // true disabled
  const softBlocked = !!disabled; // click should show toast (self powerup)
  const uiDisabled = hardDisabled || softBlocked;

  const handleClick = async (e) => {
    e.stopPropagation();

    if (!uid) {
      showInfoToast("Please login to react 😊", {
        toastId: REACT_AUTH_TOAST_ID,
      });
      return;
    }

    if (!postId || !type) return;
    if (hardDisabled) return;

    // NEW: self-block etc (do not toggle, but allow toast)
    if (softBlocked) {
      onBlockedClick?.();
      return;
    }

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

      // Show help toast only on activation, once per type per session
      if (
        nextIsActive &&
        !hasSeenHelp(type) &&
        canShowToast(REACT_HELP_TOAST_ID)
      ) {
        showInfoToast(reactionLabels[type], {
          toastId: REACT_HELP_TOAST_ID,
          autoClose: 2200,
        });
        markSeenHelp(type);
      }

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

      setIsActive(prevIsActive);
      setOptimisticDelta((d) => d + (prevIsActive ? 1 : -1));

      if (fetchActiveOnMount) fetchIsActive();
    } finally {
      setIsToggling(false);
      startCooldown();
    }
  };

  const tooltipId = `tooltip-${type}-${postId}`;

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

    const dis = uiDisabled
      ? "opacity-60 cursor-not-allowed hover:bg-transparent"
      : "cursor-pointer";

    const powerupAccent =
      type === "powerup" ? " ring-1 ring-sky-500/15 bg-sky-500/5" : "";

    return `${common} ${state} ${dis}${isActive ? powerupAccent : ""}`;
  }, [uiDisabled, isActive, activeText, type]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        // IMPORTANT: only hardDisabled uses native disabled
        disabled={hardDisabled}
        aria-disabled={uiDisabled}
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
  userId: PropTypes.string,
  fetchActiveOnMount: PropTypes.bool,

  // NEW
  disabled: PropTypes.bool,
  onBlockedClick: PropTypes.func,
};

export default ReactionIcon;
