import { useId, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";

import { showSuccessToast, showErrorToast } from "../utils/toastUtils";
import Spinner from "../components/Spinner";

const UPLOAD_TOAST_ID = "cloudinary:upload";

/**
 * @component CloudinaryUpload
 *
 * Reusable, accessible image uploader for Cloudinary (unsigned upload preset).
 * - Validates file type and size before sending any network request.
 * - Emits lifecycle callbacks so parent components can coordinate UI state:
 *   `onUploadStart` -> `onUploadComplete` | `onUploadError`
 * - Keeps SR-friendly status updates separate from visual UI status text.
 *
 * UX notes:
 * - Uses a hidden native `<input type="file">` and triggers it via "Choose file"
 * - Toasts are de-duped with a stable `toastId`
 *
 * @param {Object} props
 * @returns {JSX.Element}
 */
const CloudinaryUpload = (props) => {
  const {
    onUploadComplete,
    onUploadStart,
    onUploadError,

    id,
    label = "Upload image",
    description,

    ariaLabelledby,
    ariaDescribedby,

    disabled = false,

    // Optional UI controls for embedding in different layouts.
    centered = false,
    showFileName = true,
  } = props;

  // Support both camelCase and kebab-case aria props for ergonomic usage.
  const ariaLabelledbyFinal = ariaLabelledby || props["aria-labelledby"];
  const ariaDescribedbyFinal = ariaDescribedby || props["aria-describedby"];

  const generatedId = useId();
  const inputId = id || `cloudinary-upload-${generatedId}`;

  const [isLoading, setIsLoading] = useState(false);
  const [srStatus, setSrStatus] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [uiStatus, setUiStatus] = useState("idle"); // idle | uploading | uploaded | error

  const inputRef = useRef(null);

  // Keep long file names from breaking layout while preserving full name in title tooltip.
  const truncateName = (name) => {
    if (!name) return "";
    if (name.length <= 34) return name;
    return `${name.slice(0, 18)}...${name.slice(-12)}`;
  };

  const uiStatusText = useMemo(() => {
    // Text is intentionally short: parents own the "Save changes" step.
    if (uiStatus === "uploading") return "Uploading...";
    if (uiStatus === "uploaded")
      return 'Uploaded. Click "Save changes" to apply.';
    if (uiStatus === "error") return "Upload failed. Try again.";
    return "";
  }, [uiStatus]);

  const showUiStatus = uiStatus !== "idle";
  const hasSelectedName = Boolean(selectedName);
  const shouldShowFileName = showFileName && hasSelectedName;

  const handleChooseClick = () => {
    // Guard prevents double-trigger while loading and respects disabled state.
    if (disabled || isLoading) return;
    inputRef.current?.click();
  };

  // Resetting native input allows selecting the same file again (browser otherwise may not fire change).
  const resetNativeInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    // No file (user canceled picker): keep component in idle state.
    if (!file) {
      setSrStatus("No file selected.");
      setUiStatus("idle");
      setSelectedName("");
      return;
    }

    setSelectedName(file.name);
    setUiStatus("idle");

    // Validate client-side to avoid unnecessary Cloudinary calls.
    if (!file.type.startsWith("image/")) {
      setSrStatus("Selected file is not an image.");
      setUiStatus("error");
      showErrorToast("Please upload a valid image file.", {
        toastId: UPLOAD_TOAST_ID,
      });
      resetNativeInput();
      return;
    }

    // Enforce a simple upload limit for predictable UX and bandwidth costs.
    if (file.size > 5 * 1024 * 1024) {
      setSrStatus("File is too large. Maximum is 5MB.");
      setUiStatus("error");
      showErrorToast("File size exceeds the 5MB limit.", {
        toastId: UPLOAD_TOAST_ID,
      });
      resetNativeInput();
      return;
    }

    // Env-based config keeps secrets out of the repo and allows per-env Cloudinary projects.
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!preset || !cloud) {
      setSrStatus("Upload config missing.");
      setUiStatus("error");
      showErrorToast("Cloudinary env vars missing.", {
        toastId: UPLOAD_TOAST_ID,
      });
      resetNativeInput();
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", preset);

    setIsLoading(true);
    setUiStatus("uploading");
    setSrStatus("Uploading image.");
    onUploadStart?.();

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body },
      );

      const data = await response.json();

      // Cloudinary may return JSON with an error payload even on non-2xx responses.
      if (!response.ok) {
        const msg = data?.error?.message || "Upload failed";
        setSrStatus("Upload failed.");
        setUiStatus("error");
        onUploadError?.();
        showErrorToast(msg, { toastId: UPLOAD_TOAST_ID });
        return;
      }

      // Parent decides how/when to persist the returned URL (e.g., save form).
      onUploadComplete?.(data.secure_url);

      setUiStatus("uploaded");
      setSrStatus("Upload complete.");
      showSuccessToast("Image uploaded successfully!", {
        toastId: UPLOAD_TOAST_ID,
      });
    } catch (error) {
      setSrStatus("Upload failed.");
      setUiStatus("error");
      onUploadError?.();
      showErrorToast("Upload failed. Please try again.", {
        toastId: UPLOAD_TOAST_ID,
      });
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
      resetNativeInput();
    }
  };

  // Compose described-by chain so SR users get both static help and dynamic status.
  const describedBy = [
    description ? `${inputId}-desc` : null,
    ariaDescribedbyFinal || null,
    `${inputId}-status`,
    `${inputId}-ui-status`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-2" aria-busy={isLoading ? "true" : "false"}>
      {/* If parent provides an external label, we do not render a duplicate one here. */}
      {!ariaLabelledbyFinal && (
        <label className="ui-label" id={`${inputId}-label`}>
          {label}
        </label>
      )}

      {description && (
        <p
          id={`${inputId}-desc`}
          className={`ui-help ${centered ? "text-center" : ""}`}
        >
          {description}
        </p>
      )}

      <input
        ref={inputRef}
        id={inputId}
        name="profilePicture"
        type="file"
        onChange={handleFileUpload}
        className="sr-only"
        accept="image/*"
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading ? "true" : "false"}
        aria-labelledby={ariaLabelledbyFinal || `${inputId}-label`}
        aria-describedby={describedBy}
      />

      <div
        className={`my-2 flex items-center gap-2 ${
          centered ? "justify-center" : ""
        }`}
      >
        <button
          type="button"
          className="ui-button-secondary whitespace-nowrap"
          onClick={handleChooseClick}
          disabled={disabled || isLoading}
          aria-disabled={disabled || isLoading ? "true" : "false"}
        >
          {isLoading ? "Uploading..." : "Choose file"}
        </button>

        {shouldShowFileName && (
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm text-zinc-400"
              title={selectedName || ""}
            >
              {truncateName(selectedName)}
            </div>
          </div>
        )}
      </div>

      {showUiStatus && (
        <p
          id={`${inputId}-ui-status`}
          className={`mb-1 text-sm ${centered ? "text-center" : ""} ${
            uiStatus === "error"
              ? "text-red-400"
              : uiStatus === "uploaded"
                ? "text-emerald-400"
                : "text-zinc-400"
          }`}
          aria-live="polite"
        >
          {uiStatusText}
        </p>
      )}

      {/* SR-only status mirrors UI intent but stays concise for screen readers. */}
      <p id={`${inputId}-status`} className="sr-only" aria-live="polite">
        {srStatus}
      </p>

      {isLoading && (
        <div role="status" aria-live="polite" className="mt-2">
          <Spinner message="" />
        </div>
      )}
    </div>
  );
};

CloudinaryUpload.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  onUploadStart: PropTypes.func,
  onUploadError: PropTypes.func,

  id: PropTypes.string,
  label: PropTypes.string,
  description: PropTypes.string,

  ariaLabelledby: PropTypes.string,
  ariaDescribedby: PropTypes.string,

  // Allow kebab-case aria props (e.g. <CloudinaryUpload aria-labelledby="..." />).
  "aria-labelledby": PropTypes.string,
  "aria-describedby": PropTypes.string,

  disabled: PropTypes.bool,

  centered: PropTypes.bool,
  showFileName: PropTypes.bool,
};

export default CloudinaryUpload;
