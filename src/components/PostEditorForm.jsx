import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";

import TagsInput from "./TagsInput";
import { validCategories } from "../constants/postCategories";

// Allow broad language support while restricting to a safe, predictable set.
const TITLE_REGEX = /^[\p{L}0-9 ,.?!-]+$/u;

const DEFAULT_INITIAL_VALUES = {
  title: "",
  description: "",
  content: "",
  category: "",
  tags: [],
};

/**
 * Normalize tag inputs to stable plain strings for comparisons.
 *
 * - Accepts mixed shapes: string or objects like { text }, { id }
 * - Trims whitespace and drops empty values
 *
 * @param {Array<string|Object>} list
 * @returns {string[]}
 */
function normalizeTagTexts(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object") return t.text ?? t.id ?? "";
      return "";
    })
    .map((s) => String(s).trim())
    .filter(Boolean);
}

/**
 * Create a stable representation of form values for dirty-checking.
 *
 * - Trims user inputs to avoid false positives from trailing spaces
 * - Normalizes tags to comparable string list
 *
 * @param {Object} values
 * @returns {string}
 */
function serializeForDirtyCheck({
  title,
  description,
  content,
  category,
  tags,
}) {
  return JSON.stringify({
    title: String(title ?? "").trim(),
    description: String(description ?? "").trim(),
    content: String(content ?? "").trim(),
    category: String(category ?? "").trim(),
    tags: normalizeTagTexts(tags),
  });
}

/**
 * Validate post fields and return a keyed error map.
 *
 * - Keeps rules centralized so Create/Edit share identical constraints
 * - Category is validated against the canonical `validCategories` list
 *
 * @param {Object} fields
 * @returns {Record<string,string>}
 */
function validatePost({ title, description, content, category }) {
  const errors = {};

  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  const cleanContent = content.trim();
  const cleanCategory = category.trim();

  if (!cleanTitle) {
    errors.title = "Title is required";
  } else if (cleanTitle.length < 5) {
    errors.title = "Title must be at least 5 characters long";
  } else if (cleanTitle.length > 25) {
    errors.title = "Title must not exceed 25 characters";
  } else if (!TITLE_REGEX.test(cleanTitle)) {
    errors.title =
      "Allowed characters: letters, numbers, spaces, commas, periods, question marks, exclamation points, and hyphens.";
  }

  if (cleanDescription && cleanDescription.length < 10) {
    errors.description = "Description must be at least 10 characters long";
  }

  if (!cleanContent) {
    errors.content = "Content is required";
  } else if (cleanContent.length < 20) {
    errors.content = "Content must be at least 20 characters long";
  }

  if (!cleanCategory) {
    errors.category = "Please select a category";
  } else if (!validCategories.includes(cleanCategory)) {
    errors.category = "Invalid category selected";
  }

  return errors;
}

/**
 * Scroll an element into view with a best-effort fallback.
 *
 * @param {HTMLElement|null} el
 * @param {number} offset
 * @returns {void}
 */
function scrollToElement(el, offset = 96) {
  if (!el) return;

  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  } catch {
    // ignore
  }

  try {
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top - offset;
    window.scrollTo({ top, behavior: "smooth" });
  } catch {
    // ignore
  }
}

/**
 * Focus an element by id and then scroll it into view.
 *
 * - Uses a tiny delay to avoid layout/jank during validation render
 *
 * @param {string} id
 * @param {number} offset
 * @returns {void}
 */
function focusAndScrollById(id, offset = 96) {
  const el = document.getElementById(id);
  if (!el) return;

  try {
    el.focus();
  } catch {
    // ignore
  }

  setTimeout(() => {
    scrollToElement(el, offset);
  }, 50);
}

/**
 * Focus the first field with an error in a consistent order.
 *
 * @param {Record<string,string>} errors
 * @returns {void}
 */
function focusFirstError(errors) {
  const order = ["title", "description", "content", "category"];
  const firstKey = order.find((k) => errors[k]);
  if (!firstKey) return;

  focusAndScrollById(firstKey, 110);
}

/**
 * @component PostEditorForm
 *
 * Shared Create/Edit post editor form.
 *
 * - Validates inputs consistently via `validatePost`
 * - Tracks dirty state using a normalized serialized baseline
 * - Warns on tab close/refresh when there are unsaved changes
 * - Improves UX by focusing and scrolling to the first invalid field
 * - Supports locked mode (read-only review with saving blocked)
 *
 * Notes:
 * - Dirty checks trim values to avoid false positives from whitespace
 * - Category values are validated against `validCategories` (source of truth)
 *
 * @param {Object} props
 * @param {Object} [props.initialValues] - Pre-fill values (edit mode)
 * @param {"create"|"edit"} props.mode - Controls labels/placeholders
 * @param {boolean} [props.isSubmitting] - Disables inputs/buttons while saving
 * @param {boolean} [props.isLocked] - Locks the form (review-only)
 * @param {string} [props.lockMessage] - Custom locked banner text
 * @param {Function} props.onSubmit - Called with normalized payload
 * @param {Function} props.onCancel - Called when user cancels
 * @param {string} props.submitLabel - Submit button label (non-loading)
 * @param {string} props.cancelLabel - Cancel button label
 * @returns {JSX.Element}
 */
const PostEditorForm = ({
  initialValues = DEFAULT_INITIAL_VALUES,
  mode,
  isSubmitting = false,
  isLocked = false,
  lockMessage = "",
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
}) => {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [description, setDescription] = useState(
    initialValues.description ?? "",
  );
  const [content, setContent] = useState(initialValues.content ?? "");
  const [tags, setTags] = useState(initialValues.tags ?? []);
  const [category, setCategory] = useState(initialValues.category ?? "");
  const [errors, setErrors] = useState({});

  const firstLoadRef = useRef(true);
  const baselineRef = useRef("");

  // Initialize state once and capture baseline for dirty-checking.
  useEffect(() => {
    if (!firstLoadRef.current) return;

    const next = {
      title: initialValues.title ?? "",
      description: initialValues.description ?? "",
      content: initialValues.content ?? "",
      tags: initialValues.tags ?? [],
      category: initialValues.category ?? "",
    };

    setTitle(next.title);
    setDescription(next.description);
    setContent(next.content);
    setTags(next.tags);
    setCategory(next.category);

    baselineRef.current = serializeForDirtyCheck(next);
    firstLoadRef.current = false;

    // In locked mode, do not auto-focus (review only).
    if (isLocked) return;

    const t = setTimeout(() => {
      focusAndScrollById("title", 110);
    }, 0);

    return () => clearTimeout(t);
  }, [initialValues, isLocked]);

  const currentSerialized = useMemo(() => {
    return serializeForDirtyCheck({
      title,
      description,
      content,
      category,
      tags,
    });
  }, [title, description, content, category, tags]);

  // Dirty state is disabled in locked mode to avoid false navigation warnings.
  const isDirty = useMemo(() => {
    if (!baselineRef.current) return false;
    if (isLocked) return false;
    return baselineRef.current !== currentSerialized;
  }, [currentSerialized, isLocked]);

  // Warn on refresh/close only when the user can actually lose edits.
  useEffect(() => {
    if (!isDirty) return;
    if (isSubmitting) return;
    if (isLocked) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSubmitting, isLocked]);

  const descCount = description.length;
  const contentCount = content.length;

  const descRemaining = useMemo(
    () => Math.max(0, 300 - descCount),
    [descCount],
  );
  const contentRemaining = useMemo(
    () => Math.max(0, 5000 - contentCount),
    [contentCount],
  );

  const inputBase = "ui-input";
  const inputErr =
    "border-rose-500/80 focus-visible:ring-0 focus-visible:ring-offset-0";
  const inputOk = "";

  const disabled = Boolean(isSubmitting || isLocked);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validatePost({ title, description, content, category });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => focusFirstError(nextErrors));
      return;
    }

    setErrors({});

    // Payload is trimmed to match validation and reduce backend noise.
    const payload = {
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      category: category.trim(),
      tags,
    };

    await onSubmit(payload);
  };

  const handleCancelClick = () => {
    if (!isDirty) {
      onCancel();
      return;
    }

    const ok = window.confirm("You have unsaved changes. Discard them?");
    if (ok) onCancel();
  };

  const isCreateMode = mode === "create";
  const sectionCard =
    "rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5";
  const sectionEyebrow =
    "text-xs font-semibold uppercase tracking-wide text-sky-300";
  const sectionTitle = "mt-1 text-lg font-semibold text-zinc-100";
  const sectionHelp = "mt-1 text-sm leading-6 text-zinc-400";
  const fieldGroup = "space-y-2";
  const submitText = isSubmitting
    ? isCreateMode
      ? "Creating..."
      : "Saving..."
    : submitLabel;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {isLocked ? (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-100">
          <p className="text-sm font-medium">
            {lockMessage || "Editing is disabled for this post."}
          </p>
          <p className="mt-1 text-sm text-amber-100/80">
            You can still review the content, but saving is blocked.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="min-w-0 space-y-5">
          <section className={sectionCard} aria-labelledby="post-basics-title">
            <div className="border-b border-zinc-800 pb-4">
              <p className={sectionEyebrow}>Basics</p>
              <h2 id="post-basics-title" className={sectionTitle}>
                Set the direction
              </h2>
              <p className={sectionHelp}>
                Give readers a clear title, short summary, and category before
                they open the full post.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <div className={fieldGroup}>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="title" className="ui-label">
                    Title
                  </label>
                  <span className="text-xs text-zinc-500">
                    {title.length}/25
                  </span>
                </div>
                <input
                  id="title"
                  type="text"
                  className={`${inputBase} ${
                    errors.title ? inputErr : inputOk
                  }`}
                  placeholder={
                    mode === "edit" ? "Edit post title" : "Enter post title"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? "title-error" : "title-help"
                  }
                  disabled={disabled}
                />
                {errors.title ? (
                  <p id="title-error" className="ui-error" role="alert">
                    {errors.title}
                  </p>
                ) : (
                  <p id="title-help" className="ui-help">
                    A good title is short and descriptive.
                  </p>
                )}
              </div>

              <div className={fieldGroup}>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="description" className="ui-label">
                    Description
                  </label>
                  <span className="text-xs text-zinc-500">
                    {descCount}/300
                  </span>
                </div>
                <textarea
                  id="description"
                  className={`${inputBase} ${
                    errors.description ? inputErr : inputOk
                  } min-h-28 resize-y`}
                  placeholder="Add a short summary for the feed"
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description
                      ? "description-error"
                      : "description-help"
                  }
                  disabled={disabled}
                />
                {errors.description ? (
                  <p id="description-error" className="ui-error" role="alert">
                    {errors.description}
                  </p>
                ) : (
                  <p id="description-help" className="ui-help">
                    Optional. Recommended 10-300 characters. {descRemaining}{" "}
                    left.
                  </p>
                )}
              </div>

              <div className={fieldGroup}>
                <label htmlFor="category" className="ui-label">
                  Category
                </label>
                <select
                  id="category"
                  className={`${inputBase} ${
                    errors.category ? inputErr : inputOk
                  }`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={
                    errors.category ? "category-error" : "category-help"
                  }
                  disabled={disabled}
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
                {errors.category ? (
                  <p id="category-error" className="ui-error" role="alert">
                    {errors.category}
                  </p>
                ) : (
                  <p id="category-help" className="ui-help">
                    Pick one category that best matches your post.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={sectionCard} aria-labelledby="post-content-title">
            <div className="border-b border-zinc-800 pb-4">
              <p className={sectionEyebrow}>Content</p>
              <h2 id="post-content-title" className={sectionTitle}>
                Write the post
              </h2>
              <p className={sectionHelp}>
                Keep the useful details here. This is the main article body.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="content" className="ui-label">
                  Content
                </label>
                <span className="text-xs text-zinc-500">
                  {contentCount}/5000
                </span>
              </div>
              <textarea
                id="content"
                className={`${inputBase} ${
                  errors.content ? inputErr : inputOk
                } min-h-[18rem] resize-y leading-7`}
                placeholder={
                  mode === "edit"
                    ? "Update the main content of the post"
                    : "Write the main content of the post"
                }
                maxLength={5000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                aria-invalid={Boolean(errors.content)}
                aria-describedby={
                  errors.content ? "content-error" : "content-help"
                }
                disabled={disabled}
              />
              {errors.content ? (
                <p id="content-error" className="ui-error" role="alert">
                  {errors.content}
                </p>
              ) : (
                <p id="content-help" className="ui-help">
                  Required. Minimum 20 characters. {contentRemaining} left.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className={sectionCard} aria-labelledby="post-tags-title">
            <div className="border-b border-zinc-800 pb-4">
              <p className={sectionEyebrow}>Tags</p>
              <h2 id="post-tags-title" className={sectionTitle}>
                Add context
              </h2>
              <p className={sectionHelp}>
                Choose up to 5 tags so readers understand the topic quickly.
              </p>
            </div>

            <div className="mt-5">
              <TagsInput tags={tags} setTags={setTags} disabled={disabled} />
            </div>
          </section>

          <section className={sectionCard} aria-labelledby="post-actions-title">
            <div>
              <p className={sectionEyebrow}>Actions</p>
              <h2 id="post-actions-title" className={sectionTitle}>
                {isCreateMode ? "Create post" : "Save changes"}
              </h2>
              <p className={sectionHelp}>
                {isCreateMode
                  ? "Create the post when the required fields are ready."
                  : "Save only the updates you want to keep."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {isLocked ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Editing locked
                </div>
              ) : isDirty && !isSubmitting ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                  Unsaved changes
                </div>
              ) : (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  {isCreateMode ? "Draft in progress" : "No pending changes"}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="submit"
                  className="ui-button-primary w-full py-2.5"
                  disabled={disabled}
                >
                  {submitText}
                </button>

                <button
                  type="button"
                  className="ui-button-secondary w-full py-2.5"
                  onClick={handleCancelClick}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <p className="text-xs leading-5 text-zinc-400">
                {isCreateMode
                  ? "Required: title, content, and category. Description and tags make the post easier to scan."
                  : "Dirty-state and tab-close protection stay active while unsaved changes exist."}
              </p>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

PostEditorForm.propTypes = {
  initialValues: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.array,
  }),
  mode: PropTypes.oneOf(["create", "edit"]).isRequired,
  isSubmitting: PropTypes.bool,
  isLocked: PropTypes.bool,
  lockMessage: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  cancelLabel: PropTypes.string.isRequired,
};

export default PostEditorForm;
