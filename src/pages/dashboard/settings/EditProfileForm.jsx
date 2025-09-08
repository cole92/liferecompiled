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
    status: "Active",
    profilePicture: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    status: "Active",
    profilePicture: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Inicijalno punjenje forme i sync pri promeni userData
  useEffect(() => {
    if (userData) {
      const next = {
        name: userData.name || "",
        bio: userData.bio || "",
        status: userData.status || "Active",
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
    const allowedStatuses = ["Active", "Inactive"];

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

    if (!allowedStatuses.includes(formData.status)) {
      newErrors.status = "Invalid status";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Early return: nema razlike u odnosu na poslednje snimljeno stanje
    if (
      formData.name === originalData.name &&
      formData.bio === originalData.bio &&
      formData.status === originalData.status &&
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
      if (formData.status !== originalData.status)
        updatedData.status = formData.status;
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
          status: updatedData.status ?? originalData.status,
          profilePicture:
            updatedData.profilePicture ?? originalData.profilePicture,
        };

        setFormData(normalized);
        setOriginalData(normalized);

        showSuccessToast("Profile updated");
      } catch (error) {
        console.error("Error updating document:", error);
        showErrorToast("Update failed");
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
      status: originalData.status,
      profilePicture: originalData.profilePicture,
    });

    setErrors({});
    setTouchedName(false);
    setIsSaving(false);
  };

  return (
    <form className="space-y-6" aria-busy={isSaving}>
      {/* Profilna slika */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Picture
        </label>
        <img
          src={formData.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt="Profile"
          className="rounded-full mb-3"
          style={{ width: "100px", height: "100px" }}
        />
        <CloudinaryUpload onUploadComplete={handleUploadComplete} />
      </div>

      {/* Ime */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
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
          aria-describedby={
            touchedName && errors.name ? "name-error" : "name-help"
          }
          maxLength={NAME_MAX}
        />

        {touchedName && errors.name ? (
          // a11y: error poruka je povezana sa input-om preko aria-describedby
          <p id="name-error" className="text-red-500 text-sm mt-1">
            {errors.name}
          </p>
        ) : (
          <p id="name-help" className="text-xs text-gray-500 mt-1">
            Allowed: letters, spaces, hyphens (-), apostrophes (&apos;).{" "}
            {NAME_MIN}-{NAME_MAX} chars.
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Bio
        </label>
        <textarea
          id="bio"
          rows="3"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          maxLength={280}
        />
        <div className="text-sm mt-1 text-gray-500">
          <span className={280 - formData.bio.length < 1 ? "text-red-500" : ""}>
            {280 - formData.bio.length} characters left
          </span>
        </div>
        {errors.bio && (
          <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Status
        </label>
        <select
          id="status"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        {errors.status && (
          <p className="text-red-500 text-sm mt-1">{errors.status}</p>
        )}
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 min-w-[9rem] whitespace-nowrap"
          >
            Save Changes
          </button>
        </div>

        {/* Back link */}
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
    status: PropTypes.string,
    profilePicture: PropTypes.string,
  }).isRequired,
};

export default EditProfileForm;
