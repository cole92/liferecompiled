import PropTypes from "prop-types";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

const getModalRoot = () =>
  document.getElementById("modal-root") || document.body;

const useLockBodyScroll = (locked) => {
  useEffect(() => {
    if (!locked) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [locked]);
};

const CommentsSheet = ({
  isOpen,
  onClose,
  title = "Comments",
  count,
  children,
}) => {
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const titleId = useMemo(
    () => `comments-sheet-title-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const root = typeof document !== "undefined" ? getModalRoot() : null;
  if (!root) return null;

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[60]",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close comments"
        className={[
          "absolute inset-0 w-full h-full",
          "bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "absolute inset-x-0 bottom-0",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-full max-w-lg">
          <div
            className={[
              "ui-card",
              "rounded-t-3xl border border-zinc-800/70 bg-zinc-950/95",
              "ring-1 ring-zinc-100/5 shadow-lg",
              "overflow-hidden",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/70">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3
                    id={titleId}
                    className="text-sm font-semibold text-zinc-100 truncate"
                  >
                    {title}
                  </h3>
                  {typeof count === "number" && (
                    <span className="text-xs text-zinc-400">{count}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                aria-label="Close"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[78vh] overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    root,
  );
};

CommentsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  count: PropTypes.number,
  children: PropTypes.node.isRequired,
};

export default CommentsSheet;
