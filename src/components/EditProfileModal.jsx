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

  // State za pracenje snimanja podataka
  const [isSaving, setIsSaving] = useState(false);

  // State za Btn hover
  const [hoverMessage, setHoverMessage] = useState("Save changes");

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

  const handleMouseEnter = () => {
    if (isSaving) return; // Ako se podaci cuvaju, nista ne radi
    if (isSaveDisabled()) {
      setHoverMessage("No changes :)");
    } else {
      setHoverMessage("Save Changes"); // Ako su podaci izmenjeni, ostaje "Save Changes"
    }
  };

  const handleMouseLeave = () => {
    if (isSaving) return;
    setHoverMessage("Save Changes");
  };

  // Funkcija za validaciju podataka unetih u formu
  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[A-Za-zÀ-ÿ' -]+$/; // Regex pravilo: dozvoljeni karakteri (slova, razmaci, crtice, apostrofi)
    const allowedStatuses = ["Active", "Inactive"]; // Niz dozvoljenih statusa

    // Validacija unosa za ime
    if (!formData.name.trim()) {
      newErrors.name = "Name is required."; // Greska ako je polje prazno
    } else if (!nameRegex.test(formData.name)) {
      newErrors.name =
        "Allowed characters: letters (A-Z, a-z), spaces, hyphens (-), and apostrophes (')."; // Greska ako ime sadrzi nedozvoljene karaktere
    } else if (formData.name.length > 20) {
      newErrors.name = "Name cannot exceed 20 characters."; // Greska ako je ime predugacko
    }
    // Provera da li biografija ima manje od 200 karaktera
    if (formData.bio.length > 200) {
      newErrors.bio = "Bio must be 200 characters or less.";
    }
    // Validacija unosa za status
    if (!allowedStatuses.includes(formData.status)) {
      newErrors.status = "Invalid status";
    }
    // Postavljanje gresaka i vracanje rezultata validacije
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Funkcija za cuvanje podataka
  const handleSave = async () => {
    setIsSaving(true);

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
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };
  const isSaveDisabled = () => {
    if (isSaving) return true; // Ako se trenutno cuva, onemoguci dugme
    return (
      formData.name === userData.name &&
      formData.bio === userData.bio &&
      formData.status === userData.status
    ); // Onemoguci ako podaci nisu promenjeni
  };

  return (
    <div
      className={`modal fade ${show ? "show d-block" : "d-none"}`} // Prikaz modala u zavisnosti od `show` prop-a
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
                  placeholder="Enter your name" // Placeholder tekst za unos
                  value={formData.name} // Vrednost iz stanja forme
                  onChange={(e) => {
                    const value = e.target.value; // Trenutna vrednost uneta u polje
                    const capitalizedName =
                      value.charAt(0).toUpperCase() + value.slice(1); // Pretvaramo prvo slovo u veliko, ostatak ostaje nepromenjen
                    setFormData({ ...formData, name: capitalizedName }); // Azuriramo stanje forme sa novom vrednoscu
                  }}
                />
                {errors.name && <p className="text-danger">{errors.name}</p>}{" "}
                {/* Prikaz greske za ime */}
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
                  maxLength={200} // Sprecavamo unos vise od 200 karaktera
                  value={formData.bio} // Vrednost iz stanja
                  onChange={
                    (e) => setFormData({ ...formData, bio: e.target.value }) // Azuriranje stat-a pri unosu
                  }
                ></textarea>
                {/* Sekcija za dinamicki brojac preostalih karaktera */}
                <div
                  style={{
                    color: 200 - formData.bio.length < 1 ? "red" : "gray", // Boja zavisi od stannja
                  }}
                >
                  {200 - formData.bio.length} characters left
                </div>
                {errors.bio && <p className="text-danger">{errors.bio}</p>}{" "}
                {/* Prikaz greske za biografiju */}
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
                  value={formData.status} // Vrednost iz stanja
                  onChange={
                    (e) => setFormData({ ...formData, status: e.target.value }) // Azuriranje stat-a pri unosu
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {errors.status && (
                  <p className="text-danger">{errors.status}</p> // Prikaz greske za status
                )}
              </div>
            </form>
          </div>
          <div className="modal-footer">
            {/* Dugme za zatvaranje modala */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
            {/* Dugme za cuvanje promena */}
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaveDisabled()} // Onemoguceno ako se nista ne menja ili se cuva
              >
                {isSaving ? "Saving..." : hoverMessage || "Save Changes"}{" "}
                {/* Tekst dugmeta zavisi od `hoverMessage` */}
              </button>
            </div>
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
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    bio: PropTypes.string,
    status: PropTypes.string,
  }),
  updateUserData: PropTypes.func.isRequired,
};

export default EditProfileModal;
