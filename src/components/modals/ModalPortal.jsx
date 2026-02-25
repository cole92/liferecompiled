import { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

// Tiny helper to keep className composition readable.
const join = (...classes) => classes.filter(Boolean).join(" ");

/**
 * @component ModalPortal
 *
 * Generic modal wrapper rendered via React portal (to `document.body`) to:
 * - avoid stacking context / z-index issues
 * - lock background scroll while open
 * - support consistent close behavior (ESC + backdrop click)
 *
 * `locked` is a UI/UX gate:
 * - disables ESC and overlay click close
 * - still renders content (used for "read-only" / passive states)
 *
 * Styling hooks:
 * - overlay/container/panel className props allow reuse across different modal layouts
 * - `withPanel=false` lets callers render custom panels (no ui-card/maxWidth/padding)
 *
 * @param {boolean} isOpen
 * @param {Function=} onClose
 * @param {boolean=} locked
 * @param {React.ReactNode} children
 * @param {string=} overlayClassName
 * @param {string=} containerClassName
 * @param {string=} panelClassName
 * @param {boolean=} withPanel
 * @returns {JSX.Element|null}
 */
const ModalPortal = ({
  isOpen,
  onClose,
  locked = false,
  children,

  // Optional styling hooks
  overlayClassName = "bg-zinc-950/60",
  containerClassName = "fixed inset-0 z-50 flex items-center justify-center px-4",
  panelClassName = "",

  // When false -> no ui-card / no max-w-lg / no p-6
  withPanel = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (locked) return;
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    // Prevent background scroll while modal is open.
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
      {/* Backdrop is a real button for accessibility + simple click-to-close. */}
      <button
        type="button"
        aria-label="Close modal"
        className={join("absolute inset-0", overlayClassName)}
        onClick={() => {
          if (!locked) onClose?.();
        }}
      />

      {/* Modal content wrapper (optionally provides standard panel styling). */}
      <div className={join(panelBase, panelClassName)}>{children}</div>
    </div>,
    document.body,
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
