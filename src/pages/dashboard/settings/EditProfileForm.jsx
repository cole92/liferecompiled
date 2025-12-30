import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";

import { db } from "../../../firebase";
import CloudinaryUpload from "../../CloudinaryUpload";
import { useNavigate } from "react-router-dom";
import { DEFAULT_PROFILE_PICTURE } from "../../../constants/defaults";

import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "../../../utils/toastUtils";

/**
 * @component EditProfileForm
 *
 * Forma za izmenu korisnickih podataka (ime, bio, status, profilna slika).
 *
 * - Validira unos i prikazuje greske (name, bio, status)
 * - Onemogucava snimanje ako nema promena u odnosu na poslednje snimljeno stanje
 * - Upload profilne slike ide preko Cloudinary komponente
 * - UX: aria-describedby za input help/error i toasts za feedback
 *
 * @param {Object} userData - Podaci trenutnog korisnika
 * @returns {JSX.Element}
 */

const nameRegex = /^[\p{L}' -]+$/u; // dozvoljene su slova, razmak, hyphen i apostrof
const sanitizeName = (s) => s.replace(/\s+/g, " ").trim();

const NAME_MIN = 3;
const NAME_MAX = 30;

const EditProfileForm = ({ userData }) => {
  const navigate = useNavigate();

  // Lokalni snapshot poslednje snimljenog stanja (koristi se za diff i Cancel)
  const [originalData, setOriginalData] = useState({
    name: "",
    bio: "",
    profilePicture: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    profilePicture: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Inicijalno punjenje forme i sync pri promeni userData
  useEffect(() => {
    if (userData) {
      const next = {
        name: userData.name || "",
        bio: userData.bio || "",
        profilePicture: userData.profilePicture || "",
      };
      setFormData(next);
      setOriginalData(next); // cuvamo snapshot posle ucitavanja
    }
  }, [userData]);

  // Validacija forme (focus na name, bio, status)
  const validateForm = () => {
    const newErrors = {};

    const cleanName = sanitizeName(formData.name);

    if (!cleanName) {
      newErrors.name = "Name is required.";
    } else if (!nameRegex.test(cleanName)) {
      newErrors.name =
        "Allowed characters: letters (A-Z, a-z), spaces, hyphens (-), and apostrophes (').";
    } else if (cleanName.length > NAME_MAX) {
      newErrors.name = "Name cannot exceed 30 characters.";
    } else if (cleanName.length < NAME_MIN) {
      newErrors.name = "Name must be at least 3 characters.";
    }

    if (formData.bio.length > 280) {
      newErrors.bio = "Bio must be 280 characters or less.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Early return: nema razlike u odnosu na poslednje snimljeno stanje
    if (
      formData.name === originalData.name &&
      formData.bio === originalData.bio &&
      formData.profilePicture === originalData.profilePicture
    ) {
      showWarningToast("No changes to save");
      return;
    }

    setIsSaving(true);

    if (validateForm()) {
      const updatedData = {};
      const cleanName = sanitizeName(formData.name);

      // Difujemo polja prema snapshotu, saljemo samo promenjena
      if (cleanName !== originalData.name) updatedData.name = cleanName;
      if (formData.bio !== originalData.bio) updatedData.bio = formData.bio;
      if (formData.profilePicture !== originalData.profilePicture) {
        updatedData.profilePicture = formData.profilePicture;
      }

      // Ako posle sanitizacije zapravo nema diffa
      if (Object.keys(updatedData).length === 0) {
        showInfoToast("No changes to save");
        setIsSaving(false);
        return;
      }

      try {
        const docRef = doc(db, "users", userData.id);
        await updateDoc(docRef, updatedData);

        // Posle uspeha: normalizuj i osvezi snapshot da sledeci klik ne ponavlja save
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
    } else {
      setIsSaving(false);
    }
  };

  const handleUploadComplete = (uploadedUrl) => {
    setFormData((prev) => ({ ...prev, profilePicture: uploadedUrl }));
  };

  const handleCancel = () => {
    // Reset na poslednje snimljeno (originalData), ne na stari props
    setFormData({
      name: originalData.name,
      bio: originalData.bio,
      profilePicture: originalData.profilePicture,
    });

    setErrors({});
    setTouchedName(false);
    setIsSaving(false);
  };

  return (
    <form
      className="space-y-6"
      aria-busy={isSaving ? "true" : "false"}
      noValidate
    >
      {/* Profilna slika */}
      <div>
        <label
          id="profile-picture-label"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Profile Picture
        </label>

        <img
          src={formData.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt={
            formData.name
              ? `${formData.name} profile picture`
              : "Profile picture"
          }
          className="rounded-full mb-3"
          style={{ width: "100px", height: "100px" }}
        />

        {/* Status za upload (screen reader info) */}
        <p id="profile-picture-status" className="sr-only" aria-live="polite">
          {isUploading ? "Uploading profile picture." : "Upload idle."}
        </p>

        <CloudinaryUpload
          aria-labelledby="profile-picture-label"
          aria-describedby="profile-picture-status"
          onUploadStart={() => setIsUploading(true)}
          onUploadComplete={(url) => {
            setIsUploading(false);
            handleUploadComplete(url);
          }}
          onUploadError={() => setIsUploading(false)}
        />
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="profile-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name
        </label>

        <input
          type="text"
          id="profile-name"
          name="name"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.name}
          onChange={(e) => {
            const value = e.target.value;
            const capitalizedName = value
              ? value.charAt(0).toUpperCase() + value.slice(1)
              : "";
            setFormData({ ...formData, name: capitalizedName });
          }}
          onBlur={() => {
            setTouchedName(true);
            validateForm();
          }}
          maxLength={NAME_MAX}
          aria-invalid={touchedName && Boolean(errors.name)}
          aria-describedby="profile-name-help profile-name-error"
        />

        {/* Help je uvek tu */}
        <p id="profile-name-help" className="text-xs text-gray-500 mt-1">
          Allowed: letters, spaces, hyphens (-), apostrophes (&apos;).{" "}
          {NAME_MIN}-{NAME_MAX} chars.
        </p>

        {/* Error je uvek tu (ali prazan kad nema errora) */}
        <p
          id="profile-name-error"
          className="text-red-500 text-sm mt-1"
          role="alert"
          aria-live="polite"
        >
          {touchedName && errors.name ? errors.name : ""}
        </p>
      </div>

      {/* Bio */}
      <div>
        <label
          htmlFor="profile-bio"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Bio
        </label>

        <textarea
          id="profile-bio"
          name="bio"
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          maxLength={280}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby="profile-bio-counter profile-bio-error"
        />

        {/* Counter kao opis textarea */}
        <div
          id="profile-bio-counter"
          className="text-sm mt-1 text-gray-500"
          aria-live="polite"
        >
          <span className={280 - formData.bio.length < 1 ? "text-red-500" : ""}>
            {280 - formData.bio.length} characters left
          </span>
        </div>

        <p
          id="profile-bio-error"
          className="text-red-500 text-sm mt-1"
          role="alert"
          aria-live="polite"
        >
          {errors.bio ? errors.bio : ""}
        </p>
      </div>

      {/* Footer akcije */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 min-w-[9rem] whitespace-nowrap"
            aria-disabled={isSaving || isUploading ? "true" : "false"}
          >
            Save Changes
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          ← Back to previous page
        </button>
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
