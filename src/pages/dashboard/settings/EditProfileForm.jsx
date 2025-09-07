import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";

import { db } from "../../../firebase";
import CloudinaryUpload from "../../CloudinaryUpload";

/**
 * @component EditProfileForm
 *
 * Forma za izmenu korisnickih podataka:
 * ime, biografija, status i profilna slika.
 *
 * - Validira unos i prikazuje greske
 * - Onemogucava dugme ako nema promena
 * - Koristi Cloudinary za upload slike
 *
 * @param {Object} userData - Podaci trenutnog korisnika
 * @returns {JSX.Element}
 */

const nameRegex = /^[\p{L}' -]+$/u;
const sanitizeName = (s) => s.replace(/\s+/g, " ").trim();

const NAME_MIN = 3;
const NAME_MAX = 30;

const EditProfileForm = ({ userData }) => {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    status: "Active",
    profilePicture: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hoverMessage, setHoverMessage] = useState("Save changes");
  const [touchedName, setTouchedName] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        bio: userData.bio || "",
        status: userData.status || "Active",
        profilePicture: userData.profilePicture || "",
      });
    }
  }, [userData]);

  const handleMouseEnter = () => {
    if (isSaving) return;
    if (isSaveDisabled()) {
      setHoverMessage("No changes :)");
    } else {
      setHoverMessage("Save Changes");
    }
  };

  const handleMouseLeave = () => {
    if (!isSaving) setHoverMessage("Save Changes");
  };

  // Validacija forme
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
    setIsSaving(true);

    if (validateForm()) {
      const updatedData = {};
      const cleanName = sanitizeName(formData.name);

      if (cleanName !== userData.name) {
        updatedData.name = cleanName;
      }

      if (formData.bio !== userData.bio) updatedData.bio = formData.bio;
      if (formData.status !== userData.status)
        updatedData.status = formData.status;
      if (formData.profilePicture !== userData.profilePicture) {
        updatedData.profilePicture = formData.profilePicture;
      }

      try {
        const docRef = doc(db, "users", userData.id);
        await updateDoc(docRef, updatedData);
        console.log("Data updated successfully:", updatedData);
      } catch (error) {
        console.error("Error updating document:", error);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = () => {
    if (isSaving || !userData) return true;
    return (
      formData.name === userData.name &&
      formData.bio === userData.bio &&
      formData.status === userData.status &&
      formData.profilePicture === userData.profilePicture
    );
  };

  const handleUploadComplete = (uploadedUrl) => {
    setFormData((prev) => ({ ...prev, profilePicture: uploadedUrl }));
  };

  return (
    <form className="space-y-6">
      {/* Profilna slika */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Picture
        </label>
        <img
          src={formData.profilePicture}
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
          aria-describedby="name-help name-error"
          maxLength={30}
        />

        <p id="name-help" className="text-xs text-gray-500 mt-1">
          Allowed: letters, spaces, hyphens (-), apostrophes (&apos;). 3-30
          chars.
        </p>

        {touchedName && errors.name && (
          <p id="name-error" className="text-red-500 text-sm mt-1">
            {errors.name}
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

      {/* Dugme */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-right"
      >
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaveDisabled()}
        >
          {isSaving ? "Saving..." : hoverMessage}
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
