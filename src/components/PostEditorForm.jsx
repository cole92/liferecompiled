import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";

import TagsInput from "./TagsInput";
import { validCategories } from "../constants/postCategories";

const TITLE_REGEX = /^[\p{L}0-9 ,.?!-]+$/u;

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

function focusFirstError(errors) {
  const order = ["title", "description", "content", "category"];
  const firstKey = order.find((k) => errors[k]);
  if (!firstKey) return;

  const el = document.getElementById(firstKey);
  if (!el) return;

  // Prevent jump then smooth center.
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

const PostEditorForm = ({
  initialValues,
  mode,
  isSubmitting,
  isLocked,
  lockMessage,
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

  useEffect(() => {
    // Sync when edit data arrives (but do not override user typing mid-edit).
    if (firstLoadRef.current) {
      setTitle(initialValues.title ?? "");
      setDescription(initialValues.description ?? "");
      setContent(initialValues.content ?? "");
      setTags(initialValues.tags ?? []);
      setCategory(initialValues.category ?? "");
      firstLoadRef.current = false;
    }
  }, [initialValues]);

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

    const payload = {
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      category: category.trim(),
      tags,
    };

    await onSubmit(payload);
  };

  return (
    <div className="ui-card p-5 sm:p-7">
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

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="ui-label">
                Title
              </label>
              <input
                id="title"
                type="text"
                className={`${inputBase} ${errors.title ? inputErr : inputOk}`}
                placeholder={
                  mode === "edit" ? "Edit post title" : "Enter post title"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : "title-help"}
                disabled={disabled}
              />
              {errors.title ? (
                <p id="title-error" className="ui-error" role="alert">
                  {errors.title}
                </p>
              ) : (
                <p id="title-help" className="ui-help">
                  A good title is short and descriptive (e.g. &quot;React
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
                className={`${inputBase} ${errors.description ? inputErr : inputOk}`}
                placeholder="Enter a short description"
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? "description-error" : "description-help"
                }
                disabled={disabled}
              />
              {errors.description ? (
                <p id="description-error" className="ui-error" role="alert">
                  {errors.description}
                </p>
              ) : (
                <p id="description-help" className="ui-help">
                  Optional. Recommended 10-300 characters. {descCount}/300 (
                  {descRemaining} left)
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
                placeholder={
                  mode === "edit"
                    ? "Change the main content of the post"
                    : "Enter the main content of the post"
                }
                maxLength={5000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
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
                  Required. Min 20 characters. {contentCount}/5000 (
                  {contentRemaining} left)
                </p>
              )}
            </div>
          </div>

          {/* Side column */}
          <div className="lg:col-span-4 mt-5 lg:mt-0 space-y-5 lg:sticky lg:top-24 self-start">
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

            {/* Tags */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/20 p-4 relative overflow-visible">
              <TagsInput tags={tags} setTags={setTags} />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              <button
                type="submit"
                className="ui-button-primary py-2.5"
                disabled={disabled}
              >
                {isSubmitting ? "Saving..." : submitLabel}
              </button>

              <button
                type="button"
                className="ui-button-secondary py-2.5"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </button>
            </div>

            {/* Tiny hint */}
            <p className="text-xs text-zinc-400">
              Tip: Keep the title tight, use description for context, and put
              the real value in content.
            </p>
          </div>
        </div>
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

PostEditorForm.defaultProps = {
  initialValues: {
    title: "",
    description: "",
    content: "",
    category: "",
    tags: [],
  },
  isSubmitting: false,
  isLocked: false,
  lockMessage: "",
};

export default PostEditorForm;
