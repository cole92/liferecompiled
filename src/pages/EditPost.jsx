import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import PostEditorForm from "../components/PostEditorForm";

const EditPost = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useContext(AuthContext);

  const [postToEdit, setPostToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
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

        if (postData.userId !== user.uid) {
          showErrorToast("You are not authorized to edit this post.");
          return;
        }

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

  const createdDate = postToEdit?.createdAt?.toDate?.();
  const isAutoLocked = useMemo(() => {
    if (!createdDate) return false;
    const lockAt = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    return Date.now() > lockAt;
  }, [createdDate]);

  const handleCancel = () => navigate("/dashboard");

  const handleUpdate = async (payload) => {
    if (!postToEdit?.id) return;

    if (isAutoLocked) {
      showErrorToast("Editing is disabled. This post was locked after 7 days.");
      return;
    }

    // Compare against original to prevent no-op updates.
    const original = {
      title: postToEdit.title ?? "",
      description: postToEdit.description ?? "",
      content: postToEdit.content ?? "",
      category: postToEdit.category ?? "",
      tags: postToEdit.tags ?? [],
    };

    const isEqual = Object.keys(original).every((key) => {
      return JSON.stringify(payload[key]) === JSON.stringify(original[key]);
    });

    if (isEqual) {
      showErrorToast("No changes made.");
      return;
    }

    setIsSubmitting(true);

    try {
      const postRef = doc(db, "posts", postToEdit.id);
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

      showSuccessToast("Post successfully updated!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error) {
      console.error("Error updating post:", error);
      showErrorToast("Failed to update post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.uid) return <Spinner message="Loading user info..." />;
  if (isLoading) return <Spinner message="Loading post for editing..." />;
  if (!postToEdit) return null;

  return (
    <div className="ui-shell py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-100">Edit this post</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Update content, tags and category. Changes are saved after submit.
        </p>
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
