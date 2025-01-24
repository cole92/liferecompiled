import { useState } from "react";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [description, setDescripton] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState({});
  const titleRegex = /^[\p{L}0-9 ,.?!-]+$/u;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validacija za naslov
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

    // Validacija za opis
    if (description.trim() && description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    }

    // Validacija za sadrzaj
    if (!content.trim()) {
      newErrors.content = "Content is required";
    } else if (content.trim().length < 20) {
      newErrors.content = "Content must be at least 20 characters long";
    }

    // Validacija za kategoriju
    if (!category) {
      newErrors.category = "Please select a category";
    }

    // Proveravamo ima li gresaka
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // Postavljamo greske u state
      return; // Prekidamo proces
    }

    // Ako nema gresaka, nastavljamo
    console.log("Form is valid, submitting data:", {
      title,
      content,
      category,
    });
    setErrors({}); // Resetujemo greske

    // Logika za cuvanje posta u Firestore-u dolazi kasnije
    console.log({ title, description, content, tags, category });
  };

  return (
    <div className="container mt-5">
      <h1>Create a New Post</h1>
      <form onSubmit={handleSubmit} noValidate>
        {/* Naslov */}
        <div className="mb-3">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="title"
            className={`form-control ${errors.title ? "is-invalid" : ""}`}
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {errors.title && (
            <div className="invalid-feedback">{errors.title}</div>
          )}
          <small className="form-text text-muted">
            A good title is short and descriptive (e.g., &quot;React
            Tips&quot;).
          </small>
        </div>

        {/* Opis */}
        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            placeholder="Enter a short description"
            maxLength={300} // Sprecavamo unos vise od 300 karaktera
            value={description}
            onChange={(e) => setDescripton(e.target.value)}
            rows="3"
          />
          <small className="form-text text-muted">
            This field is optional, but if filled, please keep it between 10 and{" "}
            {300 - description.trim().length} characters.
          </small>
          {errors.description && (
            <div className="invalid-feedback">{errors.description}</div>
          )}
        </div>

        {/* Sadrzaj */}
        <div className="mb-3">
          <label htmlFor="content" className="form-label">
            Content
          </label>
          <textarea
            id="content"
            className={`form-control ${errors.content ? "is-invalid" : ""}`}
            placeholder="Enter the main content of the post"
            maxLength={5000} // Sprecavamo unos vise od 5000 karaktera
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="6"
            required
          />
          {errors.content && (
            <div className="invalid-feedback">{errors.content}</div>
          )}
          <small className="form-text text-muted">
            Content should be at least 20 characters and no longer than{" "}
            {5000 - content.trim().length} {" "}
            characters.
          </small>
        </div>

        {/* Tagovi */}
        <div className="mb-3">
          <label htmlFor="tags" className="form-label">
            Tags
          </label>
          <input
            type="text"
            id="tags"
            className="form-control"
            placeholder="Enter tags separated by commas"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* Kategorija */}
        <div className="mb-3">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            className={`form-select ${errors.category ? "is-invalid" : ""}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Full Stack">Full Stack</option>
            <option value="DevOps">DevOps</option>
          </select>
          {errors.category && (
            <div className="invalid-feedback">{errors.category}</div>
          )}
        </div>

        {/* Dugmad */}
        <button type="submit" className="btn btn-primary">
          Save Post
        </button>
        <button type="button" className="btn btn-secondary ms-3">
          Cancel
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
