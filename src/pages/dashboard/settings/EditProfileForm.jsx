import PropTypes from "prop-types";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { updateDoc, doc } from "firebase/firestore";

import { db } from "../../../firebase";
import CloudinaryUpload from "../../CloudinaryUpload";
import { DEFAULT_PROFILE_PICTURE } from "../../../constants/defaults";
import Avatar from "../../../components/common/Avatar";

import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "../../../utils/toastUtils";

const PROFILE_NO_CHANGES_TOAST_ID = "profile:nochanges";
const PROFILE_SUCCESS_TOAST_ID = "profile:success";
const PROFILE_ERROR_TOAST_ID = "profile:error";

const nameRegex = /^[\p{L}' -]+$/u;
const sanitizeName = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

const NAME_MIN = 3;
const NAME_MAX = 30;
const BIO_MAX = 280;

// Avatar positioning (percent-based)
const DEFAULT_AVATAR_POS = { x: 50, y: 20 };

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function splitUrlAndPos(url) {
  const raw = String(url || "");
  const [base, hash] = raw.split("#");

  if (!hash) return { baseUrl: base || raw, pos: DEFAULT_AVATAR_POS };

  const m = hash.match(/(?:pos|crop)=([0-9]{1,3}),([0-9]{1,3})/);
  if (!m) return { baseUrl: base || raw, pos: DEFAULT_AVATAR_POS };

  return {
    baseUrl: base || raw,
    pos: {
      x: clamp(parseInt(m[1], 10), 0, 100),
      y: clamp(parseInt(m[2], 10), 0, 100),
    },
  };
}

function buildUrlWithPos(baseUrl, pos) {
  const base = String(baseUrl || "").split("#")[0];
  if (!base) return "";
  const x = clamp(Math.round(pos?.x ?? DEFAULT_AVATAR_POS.x), 0, 100);
  const y = clamp(Math.round(pos?.y ?? DEFAULT_AVATAR_POS.y), 0, 100);
  return `${base}#pos=${x},${y}`;
}

const EditProfileForm = ({ userData }) => {
  const [originalData, setOriginalData] = useState({
    name: "",
    bio: "",
    profilePicture: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    profilePicture: "", // store base url (no hash)
  });

  const [originalAvatarPos, setOriginalAvatarPos] =
    useState(DEFAULT_AVATAR_POS);
  const [avatarPos, setAvatarPos] = useState(DEFAULT_AVATAR_POS);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 50, posY: 20 });
  const pointerIdRef = useRef(null);

  useEffect(() => {
    if (!userData) return;

    const { baseUrl, pos } = splitUrlAndPos(userData.profilePicture || "");

    const next = {
      name: userData.name || "",
      bio: userData.bio || "",
      profilePicture: baseUrl || "",
    };

    setFormData(next);
    setOriginalData(next);

    setAvatarPos(pos);
    setOriginalAvatarPos(pos);
  }, [userData]);

  const cleanName = useMemo(() => sanitizeName(formData.name), [formData.name]);

  const currentProfilePictureWithPos = useMemo(() => {
    return formData.profilePicture
      ? buildUrlWithPos(formData.profilePicture, avatarPos)
      : "";
  }, [formData.profilePicture, avatarPos]);

  const originalProfilePictureWithPos = useMemo(() => {
    return originalData.profilePicture
      ? buildUrlWithPos(originalData.profilePicture, originalAvatarPos)
      : "";
  }, [originalData.profilePicture, originalAvatarPos]);

  const hasChanges = useMemo(() => {
    const cleanOriginalName = sanitizeName(originalData.name);

    return (
      cleanName !== cleanOriginalName ||
      formData.bio !== originalData.bio ||
      currentProfilePictureWithPos !== originalProfilePictureWithPos
    );
  }, [
    cleanName,
    formData.bio,
    originalData.bio,
    currentProfilePictureWithPos,
    originalProfilePictureWithPos,
    originalData.name,
  ]);

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
      showWarningToast("No changes to save", {
        toastId: PROFILE_NO_CHANGES_TOAST_ID,
        autoClose: 1200,
      });
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

    // profile picture includes saved position
    if (currentProfilePictureWithPos !== originalProfilePictureWithPos) {
      updatedData.profilePicture = currentProfilePictureWithPos;
    }

    if (Object.keys(updatedData).length === 0) {
      showInfoToast("No changes to save", {
        toastId: PROFILE_NO_CHANGES_TOAST_ID,
        autoClose: 1200,
      });
      setIsSaving(false);
      return;
    }

    try {
      const docRef = doc(db, "users", userData.id);
      await updateDoc(docRef, updatedData);

      const normalized = {
        name: updatedData.name ?? originalData.name,
        bio: updatedData.bio ?? originalData.bio,
        // store base in form/original state, pos is stored separately
        profilePicture:
          (updatedData.profilePicture ?? originalProfilePictureWithPos).split(
            "#",
          )[0] || "",
      };

      setFormData(normalized);
      setOriginalData(normalized);

      // update original pos if we saved picture position
      if (updatedData.profilePicture) {
        setOriginalAvatarPos({ ...avatarPos });
      }

      showSuccessToast("Profile updated", {
        toastId: PROFILE_SUCCESS_TOAST_ID,
        autoClose: 1400,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      showErrorToast(error?.message || "Update failed", {
        toastId: PROFILE_ERROR_TOAST_ID,
      });
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

    setAvatarPos(originalAvatarPos);

    setErrors({});
    setTouchedName(false);
    setIsSaving(false);
  };

  // Drag handlers for avatar preview
  const onAvatarPointerDown = (e) => {
    if (!formData.profilePicture) return; // only draggable for custom image
    if (e.button != null && e.button !== 0) return;

    pointerIdRef.current = e.pointerId;
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: avatarPos.x,
      posY: avatarPos.y,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onAvatarPointerMove = (e) => {
    if (!isDragging) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
      return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Convert px movement -> percent movement (based on avatar preview size)
    const previewSize = 112; // matches Avatar size below
    const nextX = clamp(
      dragStartRef.current.posX + (dx / previewSize) * 100,
      0,
      100,
    );
    const nextY = clamp(
      dragStartRef.current.posY + (dy / previewSize) * 100,
      0,
      100,
    );

    setAvatarPos({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    pointerIdRef.current = null;
  };

  const labelClass = "block text-sm font-medium text-zinc-200 mb-1";
  const inputBase =
    "w-full rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const helpText = "text-xs text-zinc-400 mt-1";
  const errorText = "text-rose-400 text-sm mt-1";

  const avatarSrc = formData.profilePicture || DEFAULT_PROFILE_PICTURE;
  const avatarObjectPosition = `${Math.round(avatarPos.x)}% ${Math.round(
    avatarPos.y,
  )}%`;

  return (
    <form
      className="space-y-6"
      aria-busy={isSaving ? "true" : "false"}
      noValidate
    >
      <div className="grid gap-6 xl:gap-8 xl:grid-cols-[240px_1fr] xl:items-start">
        {/* Avatar + upload */}
        <div className="xl:text-center">
          <label id="profile-picture-label" className={labelClass}>
            Profile picture
          </label>

         <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center xl:flex-col xl:items-center">
            {/* Drag preview wrapper */}
           <div className="flex flex-col items-center gap-2 mx-auto sm:mx-0 xl:mx-auto">
              <div
                className={[
                  "inline-flex rounded-full",
                  formData.profilePicture
                    ? "cursor-grab active:cursor-grabbing"
                    : "",
                  "touch-none select-none",
                ].join(" ")}
                onPointerDown={onAvatarPointerDown}
                onPointerMove={onAvatarPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="Drag to reposition profile picture"
                title={
                  formData.profilePicture
                    ? "Drag to reposition"
                    : "Upload a picture to reposition"
                }
              >
                <Avatar
                  src={avatarSrc}
                  size={112}
                  zoomable={false}
                  objectPosition={
                    formData.profilePicture ? avatarObjectPosition : undefined
                  }
                />
              </div>

              {formData.profilePicture ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-400">Drag to reposition</p>
                  <button
                    type="button"
                    onClick={() => setAvatarPos(DEFAULT_AVATAR_POS)}
                    className="text-xs text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
                    disabled={isSaving || isUploading}
                  >
                    Reset position
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Upload a picture to adjust the crop
                </p>
              )}
            </div>

           <div className="w-full sm:flex-1 sm:min-w-0 xl:w-full flex flex-col items-center sm:items-start xl:items-center">
              <p
                id="profile-picture-status"
                className="sr-only"
                aria-live="polite"
              >
                {isUploading ? "Uploading profile picture." : "Upload idle."}
              </p>

              <CloudinaryUpload
                centered
                showFileName={false}
                ariaLabelledby="profile-picture-label"
                ariaDescribedby="profile-picture-status"
                disabled={isSaving}
                description="PNG/JPG up to 5MB."
                onUploadStart={() => setIsUploading(true)}
                onUploadComplete={(url) => {
                  setIsUploading(false);

                  const baseUrl = String(url || "").split("#")[0];
                  setFormData((prev) => ({ ...prev, profilePicture: baseUrl }));

                  // Default head-safe position for new uploads
                  setAvatarPos(DEFAULT_AVATAR_POS);
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
              className={`${inputBase} resize-none ui-scrollbar pr-4`}
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
