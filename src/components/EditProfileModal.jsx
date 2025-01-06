import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase"; 
import { PropTypes } from "prop-types";
import { useState, useEffect } from "react";

const EditProfileModal = ({ show, handleClose, userData, updateUserData }) => {
  // State za podatke forme
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    status: "Active",
  });
  // State za validacione greske
  const [errors, setErrors] = useState({});
   // Postavljanje pocetnih vrednosti forme iz userData
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        bio: userData.bio || "",
        status: userData.status || "Active",
      });
    }
  }, [userData]);

  // Funkcija za validaciju podataka unetih u formu
  const validateForm = () => {
    const newErrors = {};
    // Provera da li je ime uneto
    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    // Provera da li biografija ima manje od 200 karaktera
    if (formData.bio.length > 200) {
      newErrors.bio = "Bio must be 200 characters or less.";
    }
    // Provera validnosti statusa
    if (
      formData.status !== "Active" &&
      formData.status !== "Inactive" &&
      formData.status !== userData.status
    ) {
      newErrors.status = "Invalid status.";
    }
     // Postavljanje gresaka i vracanje rezultata validacije
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Funkcija za cuvanje podataka
  const handleSave = async () => {
    if (validateForm()) {
      const updatedData = {};
       // Proveravamo i pripremamo podatke za azuriranje
      if (formData.name !== userData.name) updatedData.name = formData.name;
      if (formData.bio !== userData.bio) updatedData.bio = formData.bio;
      if (formData.status !== userData.status)
        updatedData.status = formData.status;

      try {
        // Referenca na dokument korisnika u Firestore
        const docRef = doc(db, "users", userData.id);
        // Azuriranje podataka u Firestore
        await updateDoc(docRef, updatedData);
        console.log("Data updated successfully:", updatedData);
        updateUserData(updatedData); // Azuriramo lokalne podatke
        handleClose(); // Zatvaranje modala nakon uspesnog cuvanja
      } catch (error) {
        console.error("Error updating document:", error);
      }
    }
  };

  return (
    <div
      className={`modal fade ${show ? "show d-block" : "d-none"}`}  // Prikaz modala u zavisnosti od `show` prop-a
      tabIndex="-1"
      role="dialog"
      aria-hidden={!show} 
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Profile</h5> {/* Naslov modala */}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={handleClose} // Poziv funkcije za zatvaranje modala
            ></button>
          </div>
          <div className="modal-body">
            {/* Forma za unos podataka */}
            <form>
              {/* Polje za ime */}
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  placeholder="Enter your name"  // Placeholder tekst za unos
                  value={formData.name}  // Vrednost iz stanja forme
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value }) // Azuriranje stat-a pri unosu
                  }
                />
                {errors.name && <p className="text-danger">{errors.name}</p>}  {/* Prikaz greske za ime */}
              </div>

              {/* Polje za biografiju */}
              <div className="mb-3">
                <label htmlFor="bio" className="form-label">
                  Bio
                </label>
                <textarea
                  className="form-control"
                  id="bio"
                  name="bio"
                  rows="3"
                  placeholder="Tell us about yourself"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                ></textarea>
                {errors.bio && <p className="text-danger">{errors.bio}</p>}
              </div>

              {/* Polje za status */}
              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  Status
                </label>
                <select
                  className="form-select"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {errors.status && (
                  <p className="text-danger">{errors.status}</p>
                )}
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

EditProfileModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  userData: PropTypes.shape({
    id: PropTypes.string.isRequired, // Dodaj validaciju za id
    name: PropTypes.string,
    bio: PropTypes.string,
    status: PropTypes.string,
  }),
  updateUserData: PropTypes.func.isRequired,
};

export default EditProfileModal;
