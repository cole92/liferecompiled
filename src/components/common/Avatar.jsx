import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import ModalPortal from "../modals/ModalPortal";

export default function Avatar({
  src,
  size = 40,
  zoomable = false,
  badge = false,
  alt = "Avatar",
}) {
  const [open, setOpen] = useState(false);

  // ESC za zatvaranje modala
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        backdropClassName="bg-black/60"
        contentClassName="bg-transparent p-0 shadow-none border-0 max-w-[90vw] max-h-[90vh]"
      >
        <img
          src={src}
          alt={alt}
          className="rounded shadow-lg max-w-[90vw] max-h-[90vh] object-contain"
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
