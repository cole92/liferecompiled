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

  // Fokus + scroll na prvu gresku
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

  // Kreiranje posta (vraca postId ili null)
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

    // Title
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

    // Description
    if (cleanDescription && cleanDescription.length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    }

    // Content
    if (!cleanContent) {
      newErrors.content = "Content is required";
    } else if (cleanContent.length < 20) {
      newErrors.content = "Content must be at least 20 characters long";
    }

    // Category
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

    // Redirect na novi post
    navigate(`/post/${newPostId}`);

    // (nije obavezno jer odlazimo sa strane, ali cisto)
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

  return (
    <div className="container mt-5">
      <h1>Create a New Post</h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="mb-3">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            className={`form-control ${errors.title ? "is-invalid" : ""}`}
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && (
            <div className="invalid-feedback">{errors.title}</div>
          )}
          <small className="form-text text-light">
            A good title is short and descriptive (e.g. &quot;React Tips&quot;).
          </small>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            placeholder="Enter a short description"
            maxLength={300}
            value={description}
            onChange={(e) => setDescripton(e.target.value)}
            rows={3}
          />
          {errors.description && (
            <div className="invalid-feedback">{errors.description}</div>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          <label htmlFor="content" className="form-label">
            Content
          </label>
          <textarea
            id="content"
            className={`form-control ${errors.content ? "is-invalid" : ""}`}
            placeholder="Enter the main content of the post"
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          {errors.content && (
            <div className="invalid-feedback">{errors.content}</div>
          )}
        </div>

        {/* Tags */}
        <TagsInput tags={tags} setTags={setTags} />

        {/* Category */}
        <div className="mb-3">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            className={`form-select ${errors.category ? "is-invalid" : ""}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category</option>
            {validCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <div className="invalid-feedback">{errors.category}</div>
          )}
        </div>

        {/* Actions */}
        <button type="submit" className="btn btn-primary">
          Save Post
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-3"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
