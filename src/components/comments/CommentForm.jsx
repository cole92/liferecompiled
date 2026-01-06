import PropTypes from "prop-types";
import { useContext } from "react";
import { auth } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { useRef, useEffect, useState } from "react";
import { addCommentSecure } from "../../firebase/functions";
import { showErrorToast, showInfoToast } from "../../utils/toastUtils";

/**
 * @component CommentForm
 * Komponenta za unos komentara (root ili reply).
 *
 * Props:
 * - postId: id posta
 * - parentId: id roditeljskog komentara (ako je reply)
 * - onSubmitSuccess: callback posle uspesnog submit-a
 * - autoFocus: fokusira textarea i scrolluje u centar
 */
const CommentForm = ({
  postId,
  parentId,
  onSubmitSuccess,
  autoFocus = false,
}) => {
  const { currentUser } = useContext(AuthContext);
  const user = currentUser || auth.currentUser;

  const [commentContent, setCommentContent] = useState("");
  const [error, setError] = useState("");
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

    try {
      if (!user) {
        showInfoToast("Please login to comment 😊");
        return;
      }

      if (!commentContent.trim()) {
        setError("Comment form cannot be empty.");
        return;
      }

      await addCommentSecure({
        postId,
        content: commentContent,
        parentId,
      });

      setCommentContent("");
      onSubmitSuccess?.();
    } catch (error) {
      if (
        error.message.includes("too quickly") ||
        error.message.includes("resource-exhausted")
      ) {
        showErrorToast(
          "You're sending comments too quickly. Please try again in a few seconds."
        );
      } else {
        showErrorToast("An error occurred while submitting the comment.");
      }
    }
  };

  const remainingChars = 500 - commentContent.length;
  const charCountColor =
    remainingChars <= 50 ? "text-rose-300" : "text-zinc-500";

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="mt-6"
    >
      <textarea
        id={`comment-${postId}${parentId ? `-${parentId}` : ""}`}
        name="comment"
        ref={textareaRef}
        placeholder="Add comment..."
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 mb-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        rows={3}
        value={commentContent}
        onChange={(e) => {
          setCommentContent(e.target.value);
          if (error) setError("");
        }}
        maxLength={500}
        autoComplete="off"
      />

      {(!isCommentValid || error) && (
        <p className="text-zinc-400 text-sm mb-1">
          {error || "Comment cannot be empty."}
        </p>
      )}

      <div className={`text-right text-sm ${charCountColor} mb-2`}>
        {commentContent.length} / 500
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
        Send comment
      </button>
    </form>
  );
};

CommentForm.propTypes = {
  postId: PropTypes.string.isRequired,
  parentId: PropTypes.string,
  onSubmitSuccess: PropTypes.func,
  autoFocus: PropTypes.bool,
};

export default CommentForm;
