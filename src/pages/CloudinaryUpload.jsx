import { useId, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";

const CloudinaryUpload = ({
  onUploadComplete,
  onUploadStart,
  onUploadError,

  // a11y / UX props
  id,
  label = "Upload image",
  description,
  ariaLabelledby,
  ariaDescribedby,
  disabled = false,
}) => {
  const generatedId = useId();
  const inputId = id || `cloudinary-upload-${generatedId}`;

  const [isLoading, setIsLoading] = useState(false);
  const [srStatus, setSrStatus] = useState(""); // screen reader status
  const [selectedName, setSelectedName] = useState("");
  const [uiStatus, setUiStatus] = useState("idle"); // idle | uploading | uploaded | error

  const inputRef = useRef(null);

  const truncateName = (name) => {
    if (!name) return "";
    if (name.length <= 34) return name;
    return `${name.slice(0, 18)}...${name.slice(-12)}`;
  };

  const uiStatusText = useMemo(() => {
    if (uiStatus === "uploading") return "Uploading...";
    if (uiStatus === "uploaded")
      return 'Uploaded. Click "Save Changes" to apply.';
    if (uiStatus === "error") return "Upload failed. Try again.";
    return "Choose an image to upload.";
  }, [uiStatus]);

  const handleChooseClick = () => {
    if (disabled || isLoading) return;
    inputRef.current?.click();
  };

  const resetNativeInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    // user canceled picker
    if (!file) {
      setSrStatus("No file selected.");
      setUiStatus("idle");
      setSelectedName("");
      return;
    }

    setSelectedName(file.name);
    setUiStatus("idle");

    if (!file.type.startsWith("image/")) {
      setSrStatus("Selected file is not an image.");
      setUiStatus("error");
      toast.error("Please upload a valid image file.");
      resetNativeInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSrStatus("File is too large. Maximum is 5MB.");
      setUiStatus("error");
      toast.error("File size exceeds the 5MB limit.");
      resetNativeInput();
      return;
    }

    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!preset || !cloud) {
      setSrStatus("Upload config missing.");
      setUiStatus("error");
      toast.error("Cloudinary env vars missing.");
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
        { method: "POST", body }
      );

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error?.message || "Upload failed";
        setSrStatus("Upload failed.");
        setUiStatus("error");
        onUploadError?.();
        toast.error(msg);
        return;
      }

      onUploadComplete?.(data.secure_url);

      setUiStatus("uploaded");
      setSrStatus("Upload complete.");
      toast.success("Image uploaded successfully!");
    } catch (error) {
      setSrStatus("Upload failed.");
      setUiStatus("error");
      onUploadError?.();
      toast.error("Upload failed. Please try again.");
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);

      // Important: allow re-selecting the same file again
      resetNativeInput();
    }
  };

  const describedBy = [
    description ? `${inputId}-desc` : null,
    ariaDescribedby || null,
    `${inputId}-status`,
    `${inputId}-ui-status`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-2">
      {/* Label: internal label, or external via ariaLabelledby */}
      {!ariaLabelledby && (
        <label className="form-label" id={`${inputId}-label`}>
          {label}
        </label>
      )}

      {description && (
        <p id={`${inputId}-desc`} className="form-text">
          {description}
        </p>
      )}

      {/* Hidden native input (removes "No file chosen") */}
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
        aria-labelledby={ariaLabelledby || `${inputId}-label`}
        aria-describedby={describedBy}
      />

      {/* Custom chooser row */}
      <div className="d-flex align-items-center gap-2 my-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleChooseClick}
          disabled={disabled || isLoading}
          aria-disabled={disabled || isLoading ? "true" : "false"}
        >
          {isLoading ? "Uploading..." : "Choose file"}
        </button>

        <div className="flex-grow-1">
          <div
            className="small text-muted text-truncate"
            style={{ maxWidth: "320px" }}
            title={selectedName || ""}
          >
            {selectedName ? truncateName(selectedName) : "No file selected"}
          </div>
        </div>
      </div>

      {/* Visible status (UX) */}
      <p
        id={`${inputId}-ui-status`}
        className={`small mb-1 ${
          uiStatus === "error"
            ? "text-danger"
            : uiStatus === "uploaded"
            ? "text-success"
            : "text-muted"
        }`}
        aria-live="polite"
      >
        {uiStatusText}
      </p>

      {/* Screen reader status */}
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
  disabled: PropTypes.bool,
};

export default CloudinaryUpload;
