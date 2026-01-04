import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import TagsInput from "../components/TagsInput";

import { validCategories } from "../constants/postCategories";

/**
 * @function handleSubmit
 *
 * Validira formu, proverava auto-lock i razlike u odnosu na original,
 * pa po potrebi azurira post u Firestore-u.
 *
 * Ponasanje:
 * - Ako je proslo vise od 7 dana (auto-lock) -> blokira edit i prikazuje error
 * - Ako nema promena u odnosu na original -> prekida sa "No changes made."
 * - Na uspeh azurira:
 *   - `title` i `title_lc` (normalizovan naslov za search)
 *   - `description`, `content`, `tags`, `category`
 *   - `updatedAt: serverTimestamp()`
 * - Koristi `isSubmitting` da spreci vise paralelnih submit-ova
 *
 * @param {Event} e - Submit dogadjaj forme
 */
const EditPost = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useContext(AuthContext);
  const [postToEdit, setPostToEdit] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({});
  const titleRegex = /^[\p{L}0-9 ,.?!-]+$/u;

  const createdDate = postToEdit?.createdAt?.toDate?.();
  const isAutoLocked =
    createdDate && Date.now() > createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists) {
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
        console.error("Error fetching posts:", error);
        showErrorToast("Failed to load your post. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId, user.uid]);

  useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title || "");
      setDescription(postToEdit.description || "");
      setContent(postToEdit.content || "");
      setTags(postToEdit.tags || []);
      setCategory(postToEdit.category || "");
    }
  }, [postToEdit]);

  if (isLoading) {
    return <Spinner message="Loading post for editing..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newErrors = {};

    if (isAutoLocked) {
      showErrorToast("Editing is disabled. This post was locked after 7 days.");
      setIsSubmitting(false);
      return;
    }

    const newPostData = {
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      category: category,
      tags: tags,
    };

    const originalPostData = {
      title: postToEdit.title,
      description: postToEdit.description,
      content: postToEdit.content,
      category: postToEdit.category,
      tags: postToEdit.tags,
    };

    const isEqual = Object.keys(newPostData).every(
      (key) =>
        JSON.stringify(newPostData[key]) ===
        JSON.stringify(originalPostData[key])
    );

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters long";
    } else if (title.trim().length > 25) {
      newErrors.title = "Title must not exceed 25 characters";
    } else if (!titleRegex.test(title.trim())) {
      newErrors.title =
        "Allowed characters: letters, numbers, spaces, commas, periods, question marks, exclamation points, and hyphens.";
    }

    if (description.trim() && description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    } else if (content.trim().length < 20) {
      newErrors.content = "Content must be at least 20 characters long";
    }

    if (category.trim() === "") {
      newErrors.category = "Please select a category";
    } else if (!validCategories.includes(category)) {
      newErrors.category = "Invalid category selected";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    if (isEqual) {
      showErrorToast("No changes made.");
      setIsSubmitting(false);
      return;
    }

    try {
      const postRef = doc(db, "posts", postToEdit.id);

      const trimmedTitle = title.trim();
      const normalizedTitle = trimmedTitle.toLowerCase();

      await updateDoc(postRef, {
        title: trimmedTitle,
        title_lc: normalizedTitle,
        description: description.trim(),
        content: content.trim(),
        tags,
        category,
        updatedAt: serverTimestamp(),
      });

      showSuccessToast("Post successfully updated!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Error updating post:", error);
      showErrorToast("Failed to update post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = "ui-input";
  const inputErr =
    "border-rose-500/80 focus-visible:ring-0 focus-visible:ring-offset-0";
  const inputOk = "";

  return (
    <div className="ui-shell py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-100">Edit this post</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Update content, tags and category. Changes are saved after submit.
        </p>
      </div>

      <div className="ui-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="ui-label">
              Title
            </label>
            <input
              type="text"
              id="title"
              className={`${inputBase} ${errors.title ? inputErr : inputOk}`}
              placeholder="Edit post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : "title-help"}
            />
            {errors.title ? (
              <p id="title-error" className="ui-error" role="alert">
                {errors.title}
              </p>
            ) : (
              <p id="title-help" className="ui-help">
                A good title is short and descriptive (e.g., &quot;React
                Tips&quot;).
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="ui-label">
              Description
            </label>
            <textarea
              id="description"
              className={`${inputBase} ${
                errors.description ? inputErr : inputOk
              }`}
              placeholder="Enter a short description"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "description-error" : "description-help"
              }
            />
            <p id="description-help" className="ui-help">
              This field is optional, but if filled, please keep it between 10
              and {300 - description.trim().length} characters.
            </p>
            {errors.description && (
              <p id="description-error" className="ui-error" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="ui-label">
              Content
            </label>
            <textarea
              id="content"
              className={`${inputBase} ${errors.content ? inputErr : inputOk}`}
              placeholder="Change the main content of the post"
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              aria-invalid={Boolean(errors.content)}
              aria-describedby={
                errors.content ? "content-error" : "content-help"
              }
            />
            {errors.content && (
              <p id="content-error" className="ui-error" role="alert">
                {errors.content}
              </p>
            )}
            <p id="content-help" className="ui-help">
              Content should be at least 20 characters and no longer than{" "}
              {5000 - content.trim().length} characters.
            </p>
          </div>

          {/* Tags */}
          <div className="ui-card p-4">
            <TagsInput tags={tags} setTags={setTags} />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="category" className="ui-label">
              Category
            </label>
            <select
              id="category"
              className={`${inputBase} ${errors.category ? inputErr : inputOk}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "category-error" : undefined}
            >
              <option value="">Select a category</option>
              {validCategories.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  className="bg-zinc-950 text-zinc-100"
                >
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="category-error" className="ui-error" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="ui-button-primary py-2.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Post"}
            </button>

            <button
              type="button"
              className="ui-button-secondary py-2.5"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPost;
