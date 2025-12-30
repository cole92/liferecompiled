import { useId, useRef, useState } from "react";
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
  const [srStatus, setSrStatus] = useState(""); // za screen reader status poruke

  const inputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSrStatus("No file selected.");
      toast.error("Please select a file to upload!");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setSrStatus("Selected file is not an image.");
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSrStatus("File is too large. Maximum is 5MB.");
      toast.error("File size exceeds the 5MB limit.");
      return;
    }

    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!preset || !cloud) {
      setSrStatus("Upload config missing.");
      toast.error("Cloudinary env vars missing.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", preset);

    setIsLoading(true);
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
        onUploadError?.();
        toast.error(msg);
        return;
      }

      onUploadComplete?.(data.secure_url);
      setSrStatus("Upload complete.");
      toast.success("Image uploaded successfully!");
    } catch (error) {
      setSrStatus("Upload failed.");
      onUploadError?.();
      toast.error("Upload failed. Please try again.");
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const describedBy = [
    description ? `${inputId}-desc` : null,
    ariaDescribedby || null,
    `${inputId}-status`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-2">
      {/* Label: ili internal label, ili spolja preko ariaLabelledby */}
      {!ariaLabelledby && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}

      {description && (
        <p id={`${inputId}-desc`} className="form-text">
          {description}
        </p>
      )}

      <input
        ref={inputRef}
        id={inputId}
        name="profilePicture"
        type="file"
        onChange={handleFileUpload}
        className="form-control my-2"
        accept="image/*"
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading ? "true" : "false"}
        aria-labelledby={ariaLabelledby}
        aria-describedby={describedBy}
      />

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
