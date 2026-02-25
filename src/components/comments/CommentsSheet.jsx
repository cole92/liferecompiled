// components/comments/CommentsSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { FiMessageCircle } from "react-icons/fi";

import Comments from "./Comments";
import CommentForm from "./CommentForm";

const getPortalRoot = () =>
  document.getElementById("modal-root") || document.body;

const DRAG_CLOSE_PX = 96;

/**
 * @component CommentsSheet
 *
 * Mobile-first bottom sheet for reading/writing comments.
 *
 * - Uses a portal to render above the app shell (prevents z-index/layout issues).
 * - Locks body scroll while open and traps focus inside the panel for accessibility.
 * - Supports drag-to-close via a handle (threshold-based, avoids accidental closes).
 * - Keeps the composer collapsed by default to prioritize reading (and reduce visual noise).
 *
 * @param {boolean} isOpen - Controls visibility.
 * @param {Function} onClose - Close handler (Escape, backdrop click, drag threshold).
 * @param {string} postId - Current post id for comments query + composer.
 * @param {boolean} locked - If true, disables composing and shows read-only UI.
 * @param {number} count - External comment count for the header badge.
 * @param {Array<Object>} comments - Optional preloaded comments list (no internal fetching).
 * @returns {JSX.Element|null}
 */
const CommentsSheet = ({
  isOpen,
  onClose,
  postId,
  locked,
  count,
  comments,
}) => {
  const root = useMemo(() => {
    // SSR/edge safety: do not touch `document` when unavailable.
    if (typeof document === "undefined") return null;
    return getPortalRoot();
  }, []);

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Drag-to-close state (handle-only). Keeps the gesture predictable and avoids scrolling conflicts.
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const pointerIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset sheet-only UI state so reopening always starts clean.
      setIsComposerOpen(false);
      setDragY(0);
      setIsDragging(false);
      pointerIdRef.current = null;
      return;
    }

    // Focus entry: ensures keyboard users land inside the dialog.
    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      // Escape closes the sheet.
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;

      // Focus trap: keep tabbing within the panel.
      const panel = panelRef.current;
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll(
          'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
      );

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // Prevent background scroll while the modal sheet is open.
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !root) return null;

  const openComposer = () => {
    if (locked) return;
    setIsComposerOpen(true);

    // Defer focus until after layout updates to avoid focusing a non-mounted textarea.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      const ta = panel?.querySelector("textarea");
      ta?.focus?.();
    });
  };

  const onHandlePointerDown = (e) => {
    // Only primary button / touch to avoid right-click or secondary pointers.
    if (e.button != null && e.button !== 0) return;

    pointerIdRef.current = e.pointerId;
    dragStartYRef.current = e.clientY;
    setIsDragging(true);

    // Pointer capture keeps the drag stable even if the pointer leaves the handle area.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore (browser support differences)
    }
  };

  const onHandlePointerMove = (e) => {
    if (!isDragging) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
      return;

    // Only allow downward movement (no negative translate).
    const delta = e.clientY - dragStartYRef.current;
    setDragY(Math.max(0, delta));
  };

  const finishDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Close only after passing the threshold to avoid accidental dismiss.
    if (dragY >= DRAG_CLOSE_PX) {
      onClose();
      return;
    }

    // Snap back when not far enough.
    setDragY(0);
  };

  const panelTransformStyle = {
    transform: `translateY(${dragY}px)`,
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Layout: full-width on xs, centered max width on sm+ */}
      <div className="absolute inset-x-0 bottom-0 top-2 sm:top-10 flex justify-center px-0 sm:px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
          style={panelTransformStyle}
          className={[
            "h-full w-full sm:max-w-xl",
            "rounded-t-2xl sm:rounded-2xl",
            "border border-zinc-800 bg-zinc-950/90 shadow-xl overflow-hidden",
            "flex flex-col",
            // Avoid fighting the user's drag with animations; animate only when snapping.
            isDragging ? "" : "transition-transform duration-200 ease-out",
          ].join(" ")}
        >
          {/* Accessible close control (sr-only) for focus entry + keyboard users */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="sr-only"
          >
            Close comments
          </button>

          {/* Grab handle (handle-only drag to avoid interfering with list scrolling) */}
          <div className="flex justify-center pt-2 pb-2 flex-none">
            <div
              className="w-full flex justify-center touch-none select-none cursor-grab active:cursor-grabbing"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <div className="h-1.5 w-12 rounded-full bg-zinc-700/70" />
            </div>
          </div>

          {/* Header (count comes from parent to avoid duplicating list computation) */}
          <div className="flex items-baseline gap-2 px-4 pb-3 border-b border-zinc-800 flex-none">
            <h2 className="text-sm font-semibold text-zinc-100">Comments</h2>
            <span className="text-xs text-zinc-400">{count ?? 0}</span>
          </div>

          {/* List (scroll container) */}
          <div className="flex-1 overflow-y-auto px-4 py-4 ui-scrollbar">
            <Comments
              postID={postId}
              comments={comments}
              showAll
              locked={locked}
              hideHeader
              hideForm
              formWrapperClassName="mt-0"
              listWrapperClassName="mt-0"
            />
          </div>

          {/* Composer (collapsed -> expands) */}
          {!locked && (
            <div className="flex-none border-t border-zinc-800 bg-zinc-950/95 px-4 py-3">
              {!isComposerOpen ? (
                <button
                  type="button"
                  onClick={openComposer}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-center text-sm text-zinc-400 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  aria-label="Add a comment"
                >
                  <FiMessageCircle className="text-base text-zinc-500" />
                  <span>Add a comment...</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Max 500 chars</p>
                    <button
                      type="button"
                      onClick={() => setIsComposerOpen(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 transition"
                    >
                      Close
                    </button>
                  </div>

                  <CommentForm
                    postId={postId}
                    parentId={null}
                    autoFocus
                    rows={2}
                    textareaClassName="p-2.5 text-sm max-h-32"
                    wrapperClassName=""
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    root,
  );
};

CommentsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
  count: PropTypes.number,
  comments: PropTypes.array,
};

export default CommentsSheet;
