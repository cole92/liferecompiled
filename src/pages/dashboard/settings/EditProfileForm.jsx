import PropTypes from "prop-types";
import { useMemo, useState, useEffect, useCallback } from "react";
import { updateDoc, doc } from "firebase/firestore";

import { db } from "../../../firebase";
import CloudinaryUpload from "../../CloudinaryUpload";
import { DEFAULT_PROFILE_PICTURE } from "../../../constants/defaults";

import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "../../../utils/toastUtils";

const nameRegex = /^[\p{L}' -]+$/u;
const sanitizeName = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

const NAME_MIN = 3;
const NAME_MAX = 30;
const BIO_MAX = 280;

const EditProfileForm = ({ userData }) => {
  const [originalData, setOriginalData] = useState({
    name: "",
    bio: "",
    profilePicture: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    profilePicture: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  useEffect(() => {
    if (!userData) return;

    const next = {
      name: userData.name || "",
      bio: userData.bio || "",
      profilePicture: userData.profilePicture || "",
    };

    setFormData(next);
    setOriginalData(next);
  }, [userData]);

  const cleanName = useMemo(() => sanitizeName(formData.name), [formData.name]);

  const hasChanges = useMemo(() => {
    const cleanOriginalName = sanitizeName(originalData.name);

    return (
      cleanName !== cleanOriginalName ||
      formData.bio !== originalData.bio ||
      formData.profilePicture !== originalData.profilePicture
    );
  }, [cleanName, formData.bio, formData.profilePicture, originalData]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!cleanName) {
      newErrors.name = "Name is required.";
    } else if (!nameRegex.test(cleanName)) {
      newErrors.name =
        "Allowed characters: letters, spaces, hyphens (-), and apostrophes (').";
    } else if (cleanName.length > NAME_MAX) {
      newErrors.name = `Name cannot exceed ${NAME_MAX} characters.`;
    } else if (cleanName.length < NAME_MIN) {
      newErrors.name = `Name must be at least ${NAME_MIN} characters.`;
    }

    if ((formData.bio || "").length > BIO_MAX) {
      newErrors.bio = `Bio must be ${BIO_MAX} characters or less.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [cleanName, formData.bio]);

  const handleSave = async () => {
    if (!hasChanges) {
      showWarningToast("No changes to save");
      return;
    }

    setIsSaving(true);

    const ok = validateForm();
    if (!ok) {
      setIsSaving(false);
      return;
    }

    const updatedData = {};
    const cleanOriginalName = sanitizeName(originalData.name);

    if (cleanName !== cleanOriginalName) updatedData.name = cleanName;
    if (formData.bio !== originalData.bio) updatedData.bio = formData.bio;
    if (formData.profilePicture !== originalData.profilePicture) {
      updatedData.profilePicture = formData.profilePicture;
    }

    if (Object.keys(updatedData).length === 0) {
      showInfoToast("No changes to save");
      setIsSaving(false);
      return;
    }

    try {
      const docRef = doc(db, "users", userData.id);
      await updateDoc(docRef, updatedData);

      const normalized = {
        name: updatedData.name ?? originalData.name,
        bio: updatedData.bio ?? originalData.bio,
        profilePicture:
          updatedData.profilePicture ?? originalData.profilePicture,
      };

      setFormData(normalized);
      setOriginalData(normalized);

      showSuccessToast("Profile updated");
    } catch (error) {
      console.error("Error updating document:", error);
      showErrorToast(error?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: originalData.name,
      bio: originalData.bio,
      profilePicture: originalData.profilePicture,
    });

    setErrors({});
    setTouchedName(false);
    setIsSaving(false);
  };

  const labelClass = "block text-sm font-medium text-zinc-200 mb-1";
  const inputBase =
    "w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const helpText = "text-xs text-zinc-400 mt-1";
  const errorText = "text-rose-400 text-sm mt-1";

  const avatarSrc = formData.profilePicture || DEFAULT_PROFILE_PICTURE;

  return (
    <form
      className="space-y-6"
      aria-busy={isSaving ? "true" : "false"}
      noValidate
    >
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Avatar + upload */}
        <div className="lg:text-center">
          <label id="profile-picture-label" className={labelClass}>
            Profile picture
          </label>

          <div className="mt-2 flex items-center gap-4 lg:flex-col lg:items-center">
            <img
              src={avatarSrc}
              alt={
                cleanName ? `${cleanName} profile picture` : "Profile picture"
              }
              className="h-24 w-24 rounded-full object-cover border border-zinc-800"
              loading="lazy"
            />

            <div className="min-w-0 flex-1 lg:w-full">
              <p
                id="profile-picture-status"
                className="sr-only"
                aria-live="polite"
              >
                {isUploading ? "Uploading profile picture." : "Upload idle."}
              </p>

              <CloudinaryUpload
                ariaLabelledby="profile-picture-label"
                ariaDescribedby="profile-picture-status"
                disabled={isSaving}
                description="PNG/JPG up to 5MB."
                onUploadStart={() => setIsUploading(true)}
                onUploadComplete={(url) => {
                  setIsUploading(false);
                  setFormData((prev) => ({ ...prev, profilePicture: url }));
                }}
                onUploadError={() => setIsUploading(false)}
              />

              {isUploading && (
                <p className="mt-1 text-xs text-zinc-400" aria-live="polite">
                  Uploading... please wait.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-6">
          <div>
            <label htmlFor="profile-name" className={labelClass}>
              Name
            </label>

            <input
              type="text"
              id="profile-name"
              name="name"
              className={inputBase}
              value={formData.name}
              onChange={(e) => {
                const value = e.target.value || "";
                const capitalizedName = value
                  ? value.charAt(0).toUpperCase() + value.slice(1)
                  : "";
                setFormData((prev) => ({ ...prev, name: capitalizedName }));
              }}
              onBlur={() => {
                setTouchedName(true);
                validateForm();
              }}
              maxLength={NAME_MAX}
              aria-invalid={touchedName && Boolean(errors.name)}
              aria-describedby="profile-name-help profile-name-error"
            />

            <p id="profile-name-help" className={helpText}>
              Allowed: letters, spaces, hyphens (-), apostrophes (&apos;).{" "}
              {NAME_MIN}-{NAME_MAX} chars.
            </p>

            <p
              id="profile-name-error"
              className={errorText}
              role="alert"
              aria-live="polite"
            >
              {touchedName && errors.name ? errors.name : ""}
            </p>
          </div>

          <div>
            <label htmlFor="profile-bio" className={labelClass}>
              Bio
            </label>

            <textarea
              id="profile-bio"
              name="bio"
              rows={4}
              className={`${inputBase} resize-y`}
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              maxLength={BIO_MAX}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby="profile-bio-counter profile-bio-error"
            />

            <div
              id="profile-bio-counter"
              className="text-sm mt-1 text-zinc-400"
              aria-live="polite"
            >
              <span
                className={
                  BIO_MAX - formData.bio.length < 1 ? "text-rose-400" : ""
                }
              >
                {BIO_MAX - formData.bio.length} characters left
              </span>
            </div>

            <p
              id="profile-bio-error"
              className={errorText}
              role="alert"
              aria-live="polite"
            >
              {errors.bio ? errors.bio : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="ui-button-secondary disabled:opacity-50 w-full sm:w-auto"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploading || !hasChanges}
            className="ui-button-primary disabled:opacity-50 w-full sm:w-auto min-w-[10rem] whitespace-nowrap"
            aria-disabled={
              isSaving || isUploading || !hasChanges ? "true" : "false"
            }
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end">
          {!hasChanges && (
            <span className="text-xs text-zinc-500">No unsaved changes</span>
          )}
        </div>
      </div>
    </form>
  );
};

EditProfileForm.propTypes = {
  userData: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    bio: PropTypes.string,
    profilePicture: PropTypes.string,
  }).isRequired,
};

export default EditProfileForm;
