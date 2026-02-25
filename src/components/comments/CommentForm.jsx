import PropTypes from "prop-types";
import { useContext, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { auth } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { addComment } from "./commentsService";
import { showErrorToast, showInfoToast } from "../../utils/toastUtils";

const COMMENT_AUTH_TOAST_ID = "comment:auth";
const COMMENT_RATE_TOAST_ID = "comment:rate";
const COMMENT_ERROR_TOAST_ID = "comment:error";

// Cold start hint (session-only)
const COLD_START_HINT_SESSION_KEY = "comments:coldStartHintShown";
const COLD_START_HINT_DELAY_MS = 1000;

/**
 * @component CommentForm
 *
 * Comment/reply composer with client-side validation and UX helpers.
 *
 * - Uses AuthContext (fallback to `auth.currentUser`) to gate submission.
 * - Shows inline validation only after first submit attempt (avoid noisy UX while typing).
 * - Displays a one-time-per-session cold start hint when the first submit may be slow.
 * - Handles rate-limit errors with a dedicated toast (stable toastId to prevent stacking).
 *
 * @param {string} postId - Target post id.
 * @param {string|null} parentId - If set, submits as a reply to this comment id.
 * @param {Function} onSubmitSuccess - Optional callback after successful submit (e.g., refresh list / close sheet).
 * @param {boolean} autoFocus - If true, focuses and scrolls textarea into view on mount.
 * @param {string} wrapperClassName - Extra wrapper classes for layout control.
 * @param {{id: string, name: string}|null} replyingTo - Optional author context for "Replying to" row.
 * @param {number} rows - Optional textarea row override.
 * @param {string} textareaClassName - Extra textarea classes.
 * @returns {JSX.Element}
 */
const CommentForm = ({
  postId,
  parentId,
  onSubmitSuccess,
  autoFocus = false,
  wrapperClassName = "",
  replyingTo = null, // { id: string, name: string } optional
  rows,
  textareaClassName = "",
}) => {
  const { user: ctxUser } = useContext(AuthContext);

  // Prefer context user; fallback supports edge cases where auth loads before context.
  const user = ctxUser || auth.currentUser;

  const [commentContent, setCommentContent] = useState("");
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColdStartHint, setShowColdStartHint] = useState(false);

  const textareaRef = useRef(null);
  const coldHintTimerRef = useRef(null);

  // Simple validity gate for button + inline error visibility.
  const isCommentValid = commentContent.trim().length > 0;

  useEffect(() => {
    // Autofocus is opt-in to avoid stealing focus in lists/sheets.
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [autoFocus]);

  useEffect(() => {
    // Cleanup timers to avoid state updates after unmount.
    return () => {
      if (coldHintTimerRef.current) clearTimeout(coldHintTimerRef.current);
    };
  }, []);

  const startColdStartTimer = () => {
    // Only show once per session to prevent repetitive noise across multiple comments.
    try {
      const alreadyShown = sessionStorage.getItem(COLD_START_HINT_SESSION_KEY);
      if (alreadyShown) return;
    } catch {
      // ignore (some browsers/settings)
    }

    coldHintTimerRef.current = setTimeout(() => {
      setShowColdStartHint(true);
      try {
        sessionStorage.setItem(COLD_START_HINT_SESSION_KEY, "1");
      } catch {
        // ignore
      }
    }, COLD_START_HINT_DELAY_MS);
  };

  const stopColdStartTimer = () => {
    if (coldHintTimerRef.current) clearTimeout(coldHintTimerRef.current);
    coldHintTimerRef.current = null;
    setShowColdStartHint(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent double-submit (button spam / Enter repeats).
    if (isSubmitting) return;

    // Inline validation is shown only after the first submit attempt.
    setHasSubmitted(true);

    try {
      // Auth gate: keep UX friendly (toast), avoid throwing UI-level errors.
      if (!user) {
        showInfoToast("Please login to comment 😊", {
          toastId: COMMENT_AUTH_TOAST_ID,
        });
        return;
      }

      // Trim-based validation matches backend rules and avoids whitespace-only comments.
      if (!commentContent.trim()) {
        setError("Comment cannot be empty.");
        return;
      }

      setIsSubmitting(true);
      startColdStartTimer();

      // Use null parentId for top-level comments to keep data shape consistent.
      await addComment(postId, commentContent, parentId ?? null);

      // Reset local UX state after success.
      setCommentContent("");
      setError("");
      setHasSubmitted(false);
      onSubmitSuccess?.();
    } catch (err) {
      const msg = err?.message || "";

      // Rate limit is a common expected failure; show a short, deduped toast.
      if (msg.includes("too quickly") || msg.includes("resource-exhausted")) {
        showErrorToast(
          "You're sending comments too quickly. Please try again in a few seconds.",
          { toastId: COMMENT_RATE_TOAST_ID, autoClose: 2500 },
        );
      } else {
        // Generic errors should not spam the user (stable toastId).
        showErrorToast("An error occurred while submitting the comment.", {
          toastId: COMMENT_ERROR_TOAST_ID,
        });
      }
    } finally {
      stopColdStartTimer();
      setIsSubmitting(false);
    }
  };

  const remainingChars = 500 - commentContent.length;
  const showInlineError = hasSubmitted && (!isCommentValid || !!error);

  // Reply context is only shown when we have both parentId and a known target user.
  const showReplyingTo = !!parentId && !!replyingTo?.id;

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className={wrapperClassName}
    >
      {showReplyingTo && (
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <span className="opacity-80">Replying to</span>
          <Link
            to={`/profile/${replyingTo.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-200 hover:text-zinc-100 hover:underline underline-offset-4 decoration-zinc-500/70"
            aria-label={`Replying to ${replyingTo.name || "user"}`}
          >
            @{replyingTo.name || "user"}
          </Link>
        </div>
      )}

      <textarea
        id={`comment-${postId}${parentId ? `-${parentId}` : ""}`}
        name="comment"
        ref={textareaRef}
        placeholder={parentId ? "Write a reply..." : "Add a comment..."}
        className={[
          "w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-zinc-100 placeholder:text-zinc-500",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          "resize-none max-h-40 overflow-y-auto",
          isSubmitting ? "opacity-80" : "",
          textareaClassName,
        ].join(" ")}
        rows={rows ?? (parentId ? 2 : 3)}
        value={commentContent}
        onChange={(e) => {
          setCommentContent(e.target.value);
          // Clear stale inline error as soon as user starts fixing input.
          if (error) setError("");
        }}
        maxLength={500}
        autoComplete="off"
        disabled={isSubmitting}
      />

      {showInlineError && (
        <p className="mt-2 text-sm text-rose-200">
          {error || "Comment cannot be empty."}
        </p>
      )}

      {showColdStartHint && (
        <p className="mt-2 text-xs text-zinc-400">
          Heads up: the first comment may take a few seconds while the server
          wakes up. Thanks for your patience 🙂
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">
          {commentContent.length > 0 ? (
            <span
              className={
                remainingChars <= 50 ? "text-rose-300" : "text-zinc-500"
              }
            >
              {commentContent.length} / 500
            </span>
          ) : (
            <span>Max 500 chars</span>
          )}
        </div>

        <button
          type="submit"
          disabled={!isCommentValid || isSubmitting}
          className={`ui-button ${
            isCommentValid && !isSubmitting
              ? "bg-sky-600 text-zinc-50 hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              : "ui-button-secondary opacity-60 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Sending..." : parentId ? "Reply" : "Send"}
        </button>
      </div>
    </form>
  );
};

CommentForm.propTypes = {
  postId: PropTypes.string.isRequired,
  parentId: PropTypes.string,
  onSubmitSuccess: PropTypes.func,
  autoFocus: PropTypes.bool,
  wrapperClassName: PropTypes.string,
  replyingTo: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  rows: PropTypes.number,
  textareaClassName: PropTypes.string,
};

export default CommentForm;
