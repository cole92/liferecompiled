import { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

const join = (...classes) => classes.filter(Boolean).join(" ");

const ModalPortal = ({
  isOpen,
  onClose,
  locked = false,
  children,

  // optional styling hooks
  overlayClassName = "bg-zinc-950/60",
  containerClassName = "fixed inset-0 z-50 flex items-center justify-center px-4",
  panelClassName = "",

  // when false -> no ui-card / no max-w-lg / no p-6
  withPanel = true,
}) => {
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

  const panelBase = withPanel
    ? "relative w-full max-w-lg ui-card p-6"
    : "relative";

  return ReactDOM.createPortal(
    <div className={containerClassName} role="dialog" aria-modal="true">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close modal"
        className={join("absolute inset-0", overlayClassName)}
        onClick={() => {
          if (!locked) onClose?.();
        }}
      />

      {/* Content */}
      <div className={join(panelBase, panelClassName)}>{children}</div>
    </div>,
    document.body
  );
};

ModalPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  locked: PropTypes.bool,
  children: PropTypes.node.isRequired,

  overlayClassName: PropTypes.string,
  containerClassName: PropTypes.string,
  panelClassName: PropTypes.string,
  withPanel: PropTypes.bool,
};

export default ModalPortal;
