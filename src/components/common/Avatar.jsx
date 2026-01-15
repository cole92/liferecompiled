import PropTypes from "prop-types";
import { useState } from "react";
import ModalPortal from "../modals/ModalPortal";

export default function Avatar({
  src,
  size = 40,
  zoomable = false,
  badge = false,
  alt = "Avatar",
}) {
  const [open, setOpen] = useState(false);

  // Always-on subtle frame (so avatar never looks "naked")
  const baseFrame =
    "bg-zinc-900/40 ring-1 ring-zinc-700/60 shadow-sm shadow-black/30";

  // Accent only when user has badge (Top Contributor)
  const badgeRing = badge
    ? "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-zinc-950/70"
    : "";

  return (
    <>
      {/* Avatar thumbnail */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          if (zoomable) setOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && zoomable) {
            e.stopPropagation();
            if (e.key === " ") e.preventDefault();
            setOpen(true);
          }
        }}
        tabIndex={zoomable ? 0 : -1}
        role={zoomable ? "button" : undefined}
        className={[
          "rounded-full object-cover",
          baseFrame,
          badgeRing,
          zoomable ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        style={{ width: size, height: size }}
      />

      <ModalPortal
        isOpen={open && zoomable}
        onClose={() => setOpen(false)}
        backdropClassName="bg-zinc-950/90 backdrop-blur-sm"
        contentClassName="bg-transparent p-0 shadow-none border-0"
      >
        {/* Nice zoomed avatar: framed, not ugly, and not too harsh */}
        <div className="p-2 rounded-full bg-zinc-950/40 ring-1 ring-zinc-800/80 shadow-2xl">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="rounded-full object-cover w-[80vmin] h-[80vmin] max-w-[90vw] max-h-[90vh]"
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
};
