import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
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
 * Ponašanje:
 * - Ako je proslo vise od 7 dana (auto-lock) → blokira edit i prikazuje error
 * - Ako nema promena u odnosu na original → prekida sa "No changes made."
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
  const [isSubmitting, setIsSubmitting] = useState(false); // State koji prati da li je forma u procesu slanja (blokira dugmad i sprecava vise klikova)

  const [errors, setErrors] = useState({});
  // Dozvoljeni: slova, brojevi, razmaci i osnovna interpunkcija
  const titleRegex = /^[\p{L}0-9 ,.?!-]+$/u;

  // Auto-lock: nakon 7 dana editovanje ovog posta vise nije dozvoljeno
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

        // Proverava da li trenutni korisnik ima pravo da menja ovaj post
        if (postData.userId !== user.uid) {
          showErrorToast("You are not authorized to edit this post.");
          return;
        }

        // Ako je post obrisan (Trash), zabrani uredjivanje
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

  // Popunjava polja forme podacima iz postojeceg posta
  useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title || "");
      setDescription(postToEdit.description || "");
      setContent(postToEdit.content || "");
      setTags(postToEdit.tags || []);
      setCategory(postToEdit.category || "");
    }
  }, [postToEdit]);

  // Prikazuje spinner dok se post ucitava
  if (isLoading) {
    return <Spinner message="Loading post for editing..." />;
  }

  /**
   * @function handleSubmit
   * Validira podatke iz forme i azurira post u Firestore-u ako je sve ispravno.
   * Prikazuje odgovarajuce toast poruke u zavisnosti od ishoda.
   * @param {Event} e - Submit dogadjaj forme.
   */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newErrors = {};

    // Ako je post automatski zakljucan (proslo vise od 7 dana), prekidamo submit
    if (isAutoLocked) {
      showErrorToast("Editing is disabled. This post was locked after 7 days.");
      setIsSubmitting(false);
      return;
    }

    // Novi podaci iz forme koji ce se uporediti sa originalnim postom
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
    // Poredjenje svih relevantnih polja — ako se nista nije promenilo, prekidamo submit
    const isEqual = Object.keys(newPostData).every(
      (key) =>
        JSON.stringify(newPostData[key]) ===
        JSON.stringify(originalPostData[key])
    );

    // Validacija naslova
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

    // Validacija opisa (opciono)
    if (description.trim() && description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    }
    // Validacija sadrzaja
    if (!content.trim()) {
      newErrors.content = "Content is required";
    } else if (content.trim().length < 20) {
      newErrors.content = "Content must be at least 20 characters long";
    }

    // Validacija kategorije
    if (category.trim() === "") {
      newErrors.category = "Please select a category";
    } else if (!validCategories.includes(category)) {
      newErrors.category = "Invalid category selected";
    }

    // Proveravamo ima li gresaka
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Ako korisnik nije izmenio nista u odnosu na originalne vrednosti
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
        updatedAt: serverTimestamp(), // Dodajemo vreme izmene
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

  return (
    <div className="container mt-5">
      <h1>Edit this post</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          {/* Naslov */}
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="title"
            className={`form-control ${errors.title ? "is-invalid" : ""}`}
            placeholder="Edit post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {errors.title && (
            <div className="invalid-feedback">{errors.title}</div>
          )}

          <small className="form-text  text-light">
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
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
          <small className="form-text  text-light">
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
            placeholder="Change the main content of the post"
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="6"
            required
          />
          {errors.content && (
            <div className="invalid-feedback">{errors.content}</div>
          )}
          <small className="form-text  text-light">
            Content should be at least 20 characters and no longer than{" "}
            {5000 - content.trim().length} characters.
          </small>
        </div>

        {/* Komponenta za unos tagova (maks 5, podrzan drag & drop) */}
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

        {/* Dugmad za cuvanje i odustajanje */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting} // Blokira dugme dok traje slanje forme
        >
          {/* Prikazuje loading status*/}
          {isSubmitting ? "Saving..." : "Save Post"}
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-3"
          onClick={() => navigate("/dashboard")}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default EditPost;
