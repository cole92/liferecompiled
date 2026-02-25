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
    <div className="ui-shell py-6 sm:py-8">
      <div className="ui-card relative overflow-hidden p-5 sm:p-6 mb-6">
        {/* Subtle hero glow keeps this page consistent with CreatePost / dashboard surfaces. */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-semibold text-zinc-100">
            Edit this post
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Update content, tags and category. Changes are saved after submit.
          </p>
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
        submitLabel="Save Post"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default EditPost;
