// components/comments/CommentsSheet.jsx
import { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

import Comments from "./Comments";
import CommentForm from "./CommentForm";

const getPortalRoot = () =>
  document.getElementById("modal-root") || document.body;

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

  useEffect(() => {
    if (!isOpen) return;

    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

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

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 top-16 bottom-0 flex justify-center px-3 pb-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
          className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 flex-none">
            <div className="flex items-baseline gap-2 min-w-0">
              <div className="h-1 w-10 rounded-full bg-zinc-700/70 mr-1 hidden sm:block" />
              <h2 className="text-sm font-semibold text-zinc-100">Comments</h2>
              <span className="text-xs text-zinc-400">{count ?? 0}</span>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Close comments"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
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

          {!locked && (
            <div className="flex-none border-t border-zinc-800 bg-zinc-950/95 px-4 py-3">
              <CommentForm
                postId={postId}
                parentId={null}
                wrapperClassName=""
              />
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
