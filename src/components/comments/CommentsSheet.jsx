import { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

import Comments from "./Comments";

const getPortalRoot = () =>
  document.getElementById("modal-root") || document.body;

const CommentsSheet = ({
  isOpen,
  onClose,
  postId,
  currentUserId,
  locked,
  count,
}) => {
  const root = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getPortalRoot();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
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
        <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
            <div className="flex items-baseline gap-2 min-w-0">
              <div className="h-1 w-10 rounded-full bg-zinc-700/70 mr-1 hidden sm:block" />
              <h2 className="text-sm font-semibold text-zinc-100">Comments</h2>
              <span className="text-xs text-zinc-400">{count ?? 0}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Close comments"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <div className="h-full overflow-y-auto px-4 py-4">
            <Comments
              postID={postId}
              userId={currentUserId}
              showAll={true}
              locked={locked}
              repliesPreviewCount={1}
            />
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
  postId: PropTypes.string.isRequired,
  currentUserId: PropTypes.string,
  locked: PropTypes.bool,
  count: PropTypes.number,
};

export default CommentsSheet;
