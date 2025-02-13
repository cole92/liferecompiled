import { useState } from "react";
import TagsInput from "../components/TagsInput";

const CreatePost = () => {
  // State za polja forme
  const [title, setTitle] = useState(""); // Naslov posta
  const [description, setDescripton] = useState(""); // Opis posta (opciono)
  const [content, setContent] = useState(""); // Sadrzaj posta
  const [tags, setTags] = useState([]); // Tagovi posta
  const [category, setCategory] = useState(""); // Kategorija
  const [errors, setErrors] = useState({}); // State za greske u validaciji

  // Regex za validaciju naslova
  const titleRegex = /^[\p{L}0-9 ,.?!-]+$/u;

  // Funkcija za slanje forme
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {}; // Objekat za cuvanje gresaka

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

    // Validacija za opis (ako je unet)
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
    const validCategories = [
      "Frontend",
      "Backend",
      "Database & Data Management",
      "DevOps & Cloud",
      "AI & Machine Learning",
      "Career & Freelance",
      "Personal Development",
      "Lifestyle & Productivity",
      "Education & Learning",
      "Developer Health",
      "Soft Skills & Networking",
      "Inspiration & Motivation",
    ];

    if (category.trim() === "") {
      newErrors.category = "Please select a category";
    } else if (!validCategories.includes(category)) {
      newErrors.category = "Invalid category selected";
    }

    // Proveravamo ima li gresaka
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // Postavljamo greske u state
      return; // Prekidamo proces ako ima gresaka
    }

    // Ako nema gresaka, nastavljamo
    console.log("Form is valid, submitting data:", {
      title,
      description,
      content,
      category,
      tags,
    });

    // Resetovanje forme nakon uspesnog slanja
    setTitle("");
    setDescripton("");
    setContent("");
    setTags([]);
    setCategory("");
    setErrors({}); // Resetujemo greske

    // Logika za cuvanje posta u Firestore-u dolazi kasnije
    console.log({ title, description, content, category, tags });
  };
  // Funkcija za resetovanje forme (Cancel btn)
  const hadnleReset = () => {
    setTitle("");
    setDescripton("");
    setContent("");
    setTags([]);
    setCategory("");
    setErrors({});
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
            {5000 - content.trim().length} characters.
          </small>
        </div>

        {/* Tagovi */}
        <TagsInput tags={tags} setTags={setTags} />

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
            <option value="Database & Data Management">
              Database & Data Management
            </option>
            <option value="DevOps & Cloud">DevOps & Cloud</option>
            <option value="AI & Machine Learning">AI & Machine Learning</option>
            <option value="Career & Freelance">Career & Freelance</option>
            <option value="Personal Development">Personal Development</option>
            <option value="Lifestyle & Productivity">
              Lifestyle & Productivity
            </option>
            <option value="Education & Learning">Education & Learning</option>
            <option value="Developer Health">Developer Health</option>
            <option value="Soft Skills & Networking">
              Soft Skills & Networking
            </option>
            <option value="Inspiration & Motivation">
              Inspiration & Motivation
            </option>
          </select>
          {errors.category && (
            <div className="invalid-feedback">{errors.category}</div>
          )}
        </div>

        {/* Dugmad */}
        <button type="submit" className="btn btn-primary">
          Save Post
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-3"
          onClick={hadnleReset}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
