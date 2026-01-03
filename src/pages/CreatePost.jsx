import { useState, useContext } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";

import Spinner from "../components/Spinner";
import TagsInput from "../components/TagsInput";
import { validCategories } from "../constants/postCategories";

/**
 * @component CreatePost
 *
 * Forma za kreiranje novog posta.
 *
 * - Validira polja forme
 * - Kreira post u Firestore
 * - Fokusira prvu gresku (UX)
 * - Posle uspeha redirect na PostDetails
 */
const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [title, setTitle] = useState("");
  const [description, setDescripton] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState({});

  const titleRegex = /^[\p{L}0-9 ,.?!-]+$/u;

  const focusFirstError = (newErrors) => {
    const order = ["title", "description", "content", "category"];
    const firstKey = order.find((k) => newErrors[k]);
    if (!firstKey) return;

    const el = document.getElementById(firstKey);
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const createPost = async (postData) => {
    if (!user) {
      showErrorToast("You must be logged in to create a post.");
      return null;
    }

    try {
      const normalizedTitle = postData.title.toLowerCase().trim();

      const docRef = await addDoc(collection(db, "posts"), {
        ...postData,
        title_lc: normalizedTitle,
        userId: user.uid,
        createdAt: serverTimestamp(),
        deleted: false,
        deletedAt: null,
        updatedAt: null,
        locked: false,
      });

      showSuccessToast("Post successfully created!");
      return docRef.id;
    } catch (error) {
      console.error("Error creating post:", error);
      showErrorToast("Error creating post. Please try again.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanContent = content.trim();
    const cleanCategory = category.trim();

    if (!cleanTitle) {
      newErrors.title = "Title is required";
    } else if (cleanTitle.length < 5) {
      newErrors.title = "Title must be at least 5 characters long";
    } else if (cleanTitle.length > 25) {
      newErrors.title = "Title must not exceed 25 characters";
    } else if (!titleRegex.test(cleanTitle)) {
      newErrors.title =
        "Allowed characters: letters, numbers, spaces, commas, periods, question marks, exclamation points, and hyphens.";
    }

    if (cleanDescription && cleanDescription.length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    }

    if (!cleanContent) {
      newErrors.content = "Content is required";
    } else if (cleanContent.length < 20) {
      newErrors.content = "Content must be at least 20 characters long";
    }

    if (!cleanCategory) {
      newErrors.category = "Please select a category";
    } else if (!validCategories.includes(cleanCategory)) {
      newErrors.category = "Invalid category selected";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      focusFirstError(newErrors);
      return;
    }

    const postData = {
      title: cleanTitle,
      description: cleanDescription,
      content: cleanContent,
      category: cleanCategory,
      tags,
    };

    const newPostId = await createPost(postData);
    if (!newPostId) return;

    navigate(`/post/${newPostId}`);

    setTitle("");
    setDescripton("");
    setContent("");
    setTags([]);
    setCategory("");
    setErrors({});
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  if (!user) return <Spinner message="Loading user info..." />;

  const inputBase =
    "w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const inputOk = "border-zinc-700";
  const inputErr = "border-red-500";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">
          Create a New Post
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-200"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            className={`${inputBase} ${errors.title ? inputErr : inputOk}`}
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : "title-help"}
          />
          {errors.title ? (
            <p id="title-error" className="text-sm text-red-400" role="alert">
              {errors.title}
            </p>
          ) : (
            <p id="title-help" className="text-xs text-zinc-400">
              A good title is short and descriptive (e.g. &quot;React
              Tips&quot;).
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-200"
          >
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
            onChange={(e) => setDescripton(e.target.value)}
            rows={3}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : "description-help"
            }
          />
          <p id="description-help" className="text-xs text-zinc-400">
            This field is optional, but if filled, please keep it between 10 and{" "}
            {300 - description.trim().length} characters.
          </p>
          {errors.description && (
            <p
              id="description-error"
              className="text-sm text-red-400"
              role="alert"
            >
              {errors.description}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label
            htmlFor="content"
            className="block text-sm font-medium text-zinc-200"
          >
            Content
          </label>
          <textarea
            id="content"
            className={`${inputBase} ${errors.content ? inputErr : inputOk}`}
            placeholder="Enter the main content of the post"
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? "content-error" : "content-help"}
          />
          {errors.content && (
            <p id="content-error" className="text-sm text-red-400" role="alert">
              {errors.content}
            </p>
          )}
          <p id="content-help" className="text-xs text-zinc-400">
            Content should be at least 20 characters and no longer than{" "}
            {5000 - content.trim().length} characters.
          </p>
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <TagsInput tags={tags} setTags={setTags} />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-zinc-200"
          >
            Category
          </label>
          <select
            id="category"
            className={`${inputBase} ${errors.category ? inputErr : inputOk}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            <p
              id="category-error"
              className="text-sm text-red-400"
              role="alert"
            >
              {errors.category}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Save Post
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
