import { useState } from "react";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [description, setDescripton] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logika za cuvanje posta u Firestore-u dolazi kasnije
    console.log({ title, description, content, tags, category });
  };

  return (
    <div className="container mt-5">
      <h1>Create a New Post</h1>
      <form onSubmit={handleSubmit}>
        {/* Naslov */}
        <div className="mb-3">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="title"
            className="form-control"
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Opis */}
        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            className="form-control"
            placeholder="Enter a short description"
            value={description}
            onChange={(e) => setDescripton(e.target.value)}
            rows="3"
          />
        </div>

        {/* Sadrzaj */}
        <div className="mb-3">
          <label htmlFor="content" className="form-label">
            Content
          </label>
          <textarea
            id="content"
            className="form-control"
            placeholder="Enter the main content of the post"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="6"
            required
          />
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
            className="form-select"
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
