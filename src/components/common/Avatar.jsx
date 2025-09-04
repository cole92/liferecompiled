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

  const ring = badge ? "ring-2 ring-purple-800" : "";

  return (
    <>
      {/* Avatar thumbnail */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.stopPropagation(); // spreči klik na karticu
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
        className={`rounded-full object-cover ${ring} ${
          zoomable ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ width: size, height: size }}
      />

      <ModalPortal
        isOpen={open && zoomable}
        onClose={() => setOpen(false)}
        // za image-zoom: tamni overlay i čist sadržaj bez kutije
        backdropClassName="bg-black/90 backdrop-blur-sm"
        contentClassName="bg-transparent p-0 shadow-none border-0"
      >
        <img
          src={src}
          alt={alt}
          className="rounded-full object-cover shadow-2xl w-[80vmin] h-[80vmin] max-w-[90vw] max-h-[90vh]"
        />
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
