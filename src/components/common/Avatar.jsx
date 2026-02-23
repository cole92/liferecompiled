import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import ModalPortal from "../modals/ModalPortal";
import {
  AVATAR_FRAME_BASE,
  AVATAR_RING_DEFAULT,
  AVATAR_RING_TOP,
} from "../../constants/uiClasses";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseAvatarSrc(src) {
  const raw = String(src || "");
  const [base, hash] = raw.split("#");

  let objectPosition = null;

  if (hash) {
    // supports: #pos=50,20 or #crop=50,20
    const m = hash.match(/(?:pos|crop)=([0-9]{1,3}),([0-9]{1,3})/);
    if (m) {
      const x = clamp(parseInt(m[1], 10), 0, 100);
      const y = clamp(parseInt(m[2], 10), 0, 100);
      objectPosition = `${x}% ${y}%`;
    }
  }

  return { baseSrc: base || raw, objectPosition };
}

export default function Avatar({
  src,
  size = 40,
  zoomable = false,
  badge = false,
  alt = "Avatar",
  objectPosition, // optional override for previews
}) {
  const [open, setOpen] = useState(false);

  const ringClass = badge ? AVATAR_RING_TOP : AVATAR_RING_DEFAULT;

  const parsed = useMemo(() => parseAvatarSrc(src), [src]);
  const finalObjectPosition =
    objectPosition || parsed.objectPosition || "50% 50%";

  const handleOpen = (e) => {
    // Only used when zoomable is true
    e.stopPropagation();
    setOpen(true);
  };

  const handleKeyOpen = (e) => {
    // Only used when zoomable is true
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      if (e.key === " ") e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <img
        src={parsed.baseSrc}
        alt={alt}
        draggable={false}
        onClick={zoomable ? handleOpen : undefined}
        onKeyDown={zoomable ? handleKeyOpen : undefined}
        tabIndex={zoomable ? 0 : -1}
        role={zoomable ? "button" : undefined}
        className={[
          "rounded-full object-cover select-none",
          AVATAR_FRAME_BASE,
          ringClass,
          zoomable ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        style={{
          width: size,
          height: size,
          objectPosition: finalObjectPosition,
        }}
      />

      <ModalPortal
        isOpen={open && zoomable}
        onClose={() => setOpen(false)}
        overlayClassName="bg-zinc-950/90 backdrop-blur-sm"
        withPanel={false}
        panelClassName="p-0"
        containerClassName="fixed inset-0 z-[80] flex items-center justify-center px-4"
      >
        <div className="p-2 rounded-full bg-zinc-950/40 ring-1 ring-zinc-800/80 shadow-2xl">
          <img
            src={parsed.baseSrc}
            alt={alt}
            draggable={false}
            className="rounded-full object-cover w-[70vmin] h-[70vmin] max-w-[90vw] max-h-[90vh]"
            style={{ objectPosition: finalObjectPosition }}
          />
        </div>
      </ModalPortal>
    </>
  );
}

Avatar.propTypes = {
  src: PropTypes.string.isRequired,
  size: PropTypes.number,
  zoomable: PropTypes.bool,
  badge: PropTypes.bool,
  alt: PropTypes.string,
  objectPosition: PropTypes.string,
};
