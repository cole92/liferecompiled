import PropTypes from "prop-types";
import { useState } from "react";
import ModalPortal from "../modals/ModalPortal";
import {
  AVATAR_FRAME_BASE,
  AVATAR_RING_DEFAULT,
  AVATAR_RING_TOP,
} from "../../constants/uiClasses";

export default function Avatar({
  src,
  size = 40,
  zoomable = false,
  badge = false,
  alt = "Avatar",
}) {
  const [open, setOpen] = useState(false);

  const ringClass = badge ? AVATAR_RING_TOP : AVATAR_RING_DEFAULT;

  return (
    <>
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
          "rounded-full object-cover select-none",
          AVATAR_FRAME_BASE,
          ringClass,
          zoomable ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        style={{ width: size, height: size }}
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
            src={src}
            alt={alt}
            draggable={false}
            className="rounded-full object-cover w-[70vmin] h-[70vmin] max-w-[90vw] max-h-[90vh]"
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
