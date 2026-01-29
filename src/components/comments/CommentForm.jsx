// components/comments/CommentForm.jsx
import PropTypes from "prop-types";
import { useContext, useRef, useEffect, useState } from "react";
import { auth } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { addComment } from "./commentsService";
import { showErrorToast, showInfoToast } from "../../utils/toastUtils";

const CommentForm = ({
  postId,
  parentId,
  onSubmitSuccess,
  autoFocus = false,
  wrapperClassName = "",
}) => {
  // Standardize: AuthContext provides { user }
  const { user: ctxUser } = useContext(AuthContext);
  const user = ctxUser || auth.currentUser;

  const [commentContent, setCommentContent] = useState("");
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const textareaRef = useRef(null);
  const isCommentValid = commentContent.trim().length > 0;

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [autoFocus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHasSubmitted(true);

    try {
      if (!user) {
        showInfoToast("Please login to comment 😊");
        return;
      }

      if (!commentContent.trim()) {
        setError("Comment cannot be empty.");
        return;
      }

      await addComment(postId, commentContent, parentId ?? null);

      setCommentContent("");
      setError("");
      setHasSubmitted(false);
      onSubmitSuccess?.();
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("too quickly") || msg.includes("resource-exhausted")) {
        showErrorToast(
          "You're sending comments too quickly. Please try again in a few seconds.",
        );
      } else {
        showErrorToast("An error occurred while submitting the comment.");
      }
    }
  };

  const remainingChars = 500 - commentContent.length;
  const showInlineError = hasSubmitted && (!isCommentValid || !!error);

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className={wrapperClassName}
    >
      <textarea
        id={`comment-${postId}${parentId ? `-${parentId}` : ""}`}
        name="comment"
        ref={textareaRef}
        placeholder={parentId ? "Write a reply..." : "Add a comment..."}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        rows={parentId ? 2 : 3}
        value={commentContent}
        onChange={(e) => {
          setCommentContent(e.target.value);
          if (error) setError("");
        }}
        maxLength={500}
        autoComplete="off"
      />

      {showInlineError && (
        <p className="mt-2 text-sm text-rose-200">
          {error || "Comment cannot be empty."}
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
          disabled={!isCommentValid}
          className={`ui-button ${
            isCommentValid
              ? "bg-sky-600 text-zinc-50 hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              : "ui-button-secondary opacity-60 cursor-not-allowed"
          }`}
        >
          {parentId ? "Reply" : "Send"}
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
};

export default CommentForm;
