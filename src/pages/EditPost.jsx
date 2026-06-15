import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import PostEditorForm from "../components/PostEditorForm";

/**
 * @component EditPost
 *
 * Post edit page with ownership + lifecycle guards.
 * - Loads the post by `postId` and verifies the current user owns it
 * - Blocks editing for deleted posts (Trash) and for posts auto-locked after 7 days
 * - Delegates all form UI/validation to `PostEditorForm`
 *
 * Data notes:
 * - Stores `title_lc` for case-insensitive search/sort patterns
 * - Uses `serverTimestamp()` for `updatedAt` to keep timestamps consistent
 *
 * @returns {JSX.Element|null}
 */
const EditPost = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useContext(AuthContext);

  const [postToEdit, setPostToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      // Guard: wait until auth state is stable enough to validate ownership.
      if (!user?.uid) return;

      setIsLoading(true);

      try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
          showErrorToast("Post does not exist.");
          return;
        }

        const postData = postSnap.data();

        // Ownership gate: users can only edit their own posts.
        if (postData.userId !== user.uid) {
          showErrorToast("You are not authorized to edit this post.");
          return;
        }

        // Trash gate: deleted posts must be restored before edits are allowed.
        if (postData.deleted) {
          showErrorToast("This post is in Trash and cannot be edited.");
          return;
        }

        setPostToEdit({ id: postSnap.id, ...postData });
      } catch (error) {
        console.error("Error fetching post:", error);
        showErrorToast("Failed to load your post. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId, user?.uid]);

  // Auto-lock is derived from createdAt so the rule is stable across sessions/devices.
  const createdDate = postToEdit?.createdAt?.toDate?.();
  const isAutoLocked = useMemo(() => {
    if (!createdDate) return false;
    const lockAt = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    return Date.now() > lockAt;
  }, [createdDate]);

  // Cancel returns the user to the dashboard list (edit is a dashboard workflow).
  const handleCancel = () => navigate("/dashboard");

  /**
   * Persist edits if:
   * - The post is not auto-locked
   * - The payload differs from the original fields
   *
   * @param {Object} payload - normalized payload from `PostEditorForm`
   * @returns {Promise<void>}
   */
  const handleUpdate = async (payload) => {
    if (!postToEdit?.id) return;

    // Safety gate: avoid a race where UI is editable but the rule says otherwise.
    if (isAutoLocked) {
      showErrorToast("Editing is disabled. This post was locked after 7 days.");
      return;
    }

    const original = {
      title: postToEdit.title ?? "",
      description: postToEdit.description ?? "",
      content: postToEdit.content ?? "",
      category: postToEdit.category ?? "",
      tags: postToEdit.tags ?? [],
    };

    // Simple deep compare to skip no-op writes (reduces writes + avoids confusing success states).
    const isEqual = Object.keys(original).every((key) => {
      return JSON.stringify(payload[key]) === JSON.stringify(original[key]);
    });

    if (isEqual) {
      showErrorToast("No changes made.");
      return;
    }

    setIsSubmitting(true);

    let didSucceed = false;

    try {
      const postRef = doc(db, "posts", postToEdit.id);

      // Normalized title powers case-insensitive queries.
      const normalizedTitle = payload.title.toLowerCase();

      await updateDoc(postRef, {
        title: payload.title,
        title_lc: normalizedTitle,
        description: payload.description,
        content: payload.content,
        tags: payload.tags,
        category: payload.category,
        updatedAt: serverTimestamp(),
      });

      didSucceed = true;
      showSuccessToast("Post successfully updated!");

      // Small delay gives users time to see the success toast before leaving the page.
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (error) {
      console.error("Error updating post:", error);
      showErrorToast("Failed to update post. Please try again.");
      setIsSubmitting(false);
    } finally {
      if (!didSucceed) setIsSubmitting(false);
    }
  };

  // Auth bootstrap guard: avoids fetching/editing without a stable uid.
  if (!user?.uid) return <Spinner message="Loading user info..." />;
  if (isLoading) return <Spinner message="Loading post for editing..." />;

  // If gates failed (not found / not owner / deleted), we already showed a toast.
  if (!postToEdit) return null;

  return (
    <div className="py-2 sm:py-4">
      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
              Edit workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-100 sm:text-3xl">
              Edit post
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              Update the content, tags, and category while the edit window is
              still open.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${
              isAutoLocked
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {isAutoLocked ? "Locked" : "Editable"}
          </div>
        </div>
      </div>

      <PostEditorForm
        mode="edit"
        initialValues={{
          title: postToEdit.title || "",
          description: postToEdit.description || "",
          content: postToEdit.content || "",
          category: postToEdit.category || "",
          tags: postToEdit.tags || [],
        }}
        isSubmitting={isSubmitting}
        isLocked={isAutoLocked}
        lockMessage="Editing is disabled. This post was locked after 7 days."
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        submitLabel="Save changes"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default EditPost;
