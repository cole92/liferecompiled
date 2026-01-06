import { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

const ModalPortal = ({ isOpen, onClose, locked = false, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (locked) return;
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, locked]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-zinc-950/60"
        onClick={() => {
          if (!locked) onClose?.();
        }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg ui-card p-6">{children}</div>
    </div>,
    document.body
  );
};

ModalPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  locked: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default ModalPortal;
