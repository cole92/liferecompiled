import { useEffect, useState } from "react";

const OrientationGuard = () => {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Phone-like landscape: small height + coarse pointer.
    const mq = window.matchMedia(
      "(orientation: landscape) and (max-height: 520px) and (pointer: coarse)",
    );

    const compute = () => {
      // Fallback for browsers that behave oddly with matchMedia
      const isLandscape = window.innerWidth > window.innerHeight;
      const isPhoneLike = window.innerHeight <= 520; // landscape phone height is usually small
      setBlocked(mq.matches || (isLandscape && isPhoneLike));
    };

    compute();

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
