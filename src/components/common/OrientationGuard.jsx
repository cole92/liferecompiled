import { useEffect, useState } from "react";

/**
 * @component OrientationGuard
 *
 * Fullscreen guard for "phone-like" landscape where UI becomes cramped/unusable.
 *
 * Detection strategy:
 * - Prefer `matchMedia` for orientation + small height + coarse pointer (touch devices).
 * - Add a width/height fallback for browsers that report `matchMedia` inconsistently.
 *
 * UX:
 * - When blocked, lock body scroll to avoid background interaction.
 * - Render nothing when not blocked (zero cost in normal flows).
 *
 * @returns {JSX.Element|null}
 */
const OrientationGuard = () => {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Phone-like landscape: small height + touch pointer (avoids blocking tablets/desktops).
    const mq = window.matchMedia(
      "(orientation: landscape) and (max-height: 520px) and (pointer: coarse)",
    );

    const compute = () => {
      // Fallback for browsers that behave oddly with `matchMedia`.
      const isLandscape = window.innerWidth > window.innerHeight;
      const isPhoneLike = window.innerHeight <= 520;
      setBlocked(mq.matches || (isLandscape && isPhoneLike));
    };

    compute();

    // Support both modern and legacy matchMedia event APIs.
    mq.addEventListener?.("change", compute) ?? mq.addListener(compute);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);

    return () => {
      mq.removeEventListener?.("change", compute) ?? mq.removeListener(compute);
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  useEffect(() => {
    if (!blocked) return;

    // Prevent background scroll/interaction while the guard overlay is visible.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [blocked]);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-center shadow-xl">
        <div className="text-3xl">📱</div>
        <h2 className="mt-3 text-lg font-semibold text-zinc-100">
          Please rotate your phone
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          This app is optimized for portrait mode.
        </p>
      </div>
    </div>
  );
};

export default OrientationGuard;
