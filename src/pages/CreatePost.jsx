import { useContext, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import PostEditorForm from "../components/PostEditorForm";

/**
 * @component CreatePost
 *
 * Post creation page.
 * - Delegates all validation/UI to `PostEditorForm`
 * - Persists a new post in Firestore and navigates to the new post details page
 *
 * Data notes:
 * - Stores `title_lc` for case-insensitive search/sort patterns
 * - Initializes moderation/control fields (`deleted`, `locked`, timestamps)
 *
 * @returns {JSX.Element}
 */
const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Cancel behavior:
   * - Prefer "back" when there is history (feels natural after navigation)
   * - Fallback to dashboard when opened directly (no reliable history)
   */
  const handleCancel = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  /**
   * Persist a new post for the current user.
   * Uses `serverTimestamp()` so createdAt is consistent across clients/timezones.
   *
   * @param {Object} postData - normalized payload from `PostEditorForm`
   * @returns {Promise<void>}
   */
  const handleCreate = async (postData) => {
    // Guard: creation is not allowed without an authenticated user.
    if (!user) {
      showErrorToast("You must be logged in to create a post.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Lowercased title is used for case-insensitive searching.
      const normalizedTitle = postData.title.toLowerCase().trim();

      const docRef = await addDoc(collection(db, "posts"), {
        ...postData,
        title_lc: normalizedTitle,
        userId: user.uid,
        createdAt: serverTimestamp(),

        // Default lifecycle fields (kept explicit for readability).
        deleted: false,
        deletedAt: null,
        updatedAt: null,
        locked: false,
      });

      showSuccessToast("Post successfully created!");
      navigate(`/post/${docRef.id}`);
    } catch (error) {
      console.error("Error creating post:", error);
      showErrorToast("Error creating post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth bootstrap guard: avoids rendering a form that cannot submit.
  if (!user) return <Spinner message="Loading user info..." />;

  return (
    <div className="py-2 sm:py-4">
      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
              Create workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-100 sm:text-3xl">
              New post
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              Shape the idea, add context, and choose the details readers need
              before publishing it to the feed.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
            Drafting
          </div>
        </div>
      </div>

      <PostEditorForm
        mode="create"
        initialValues={{
          title: "",
          description: "",
          content: "",
          category: "",
          tags: [],
        }}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        submitLabel="Create post"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default CreatePost;
