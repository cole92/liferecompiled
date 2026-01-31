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

const CommentsSheet = ({
  isOpen,
  onClose,
  postId,
  locked,
  count,
  comments,
}) => {
  const root = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getPortalRoot();
  }, []);

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // drag-to-close (handle)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const pointerIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setIsComposerOpen(false);
      setDragY(0);
      setIsDragging(false);
      pointerIdRef.current = null;
      return;
    }

    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;

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

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      const ta = panel?.querySelector("textarea");
      ta?.focus?.();
    });
  };

  const onHandlePointerDown = (e) => {
    // only primary button / touch
    if (e.button != null && e.button !== 0) return;

    pointerIdRef.current = e.pointerId;
    dragStartYRef.current = e.clientY;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onHandlePointerMove = (e) => {
    if (!isDragging) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
      return;

    const delta = e.clientY - dragStartYRef.current;
    setDragY(Math.max(0, delta));
  };

  const finishDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragY >= DRAG_CLOSE_PX) {
      onClose();
      return;
    }

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

      {/* Make it taller + full width on xs (no side padding), centered max width on sm+ */}
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
            isDragging ? "" : "transition-transform duration-200 ease-out",
          ].join(" ")}
        >
          {/* Keep an accessible close control (invisible) so focus/keyboard is OK */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="sr-only"
          >
            Close comments
          </button>

          {/* Grab handle (always visible + centered) */}
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

          {/* Header (no X) */}
          <div className="flex items-baseline gap-2 px-4 pb-3 border-b border-zinc-800 flex-none">
            <h2 className="text-sm font-semibold text-zinc-100">Comments</h2>
            <span className="text-xs text-zinc-400">{count ?? 0}</span>
          </div>

          {/* List */}
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
