import { useState } from "react";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";

const CloudinaryUpload = () => {
  
  const [imageUrl, setImageUrl] = useState(""); // State za cuvanje URL-a slike nakon upload-a
  const [isLoading, setIsLoading] = useState(false) // Indikator za loading

  // Funkcija za obradu upload-a
  const handleFileUpload = async (event) => {
    // Dohvatamo fajl koji je korisnik izabrao
    const file = event.target.files[0];

    // Proveravamo da li je fajl izabran
    if (!file) {
      toast.error("Please select a file to upload!"); // Poruka o gresci
      return;
    }

    // Validacija fajla
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds the 5MB limit.");
      return;
    }

    // Pripremamo FormData za slanje na Cloudinary
    const formData = new FormData();
    formData.append("file", file); // Dodajemo fajl
    formData.append(
      "upload_preset",
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    ); // Dodajemo upload preset

    setIsLoading(true); // Aktiviramo loading

    try {
      // Saljemo POST zahtev ka Cloudinary API-ju
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        }/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Pretvaramo odgovor u JSON
      const data = await response.json();
      // Cuvamo URL slike u state
      setImageUrl(data.secure_url);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed. Please try again.");
      console.error("Error uploading file:", error);
    } finally {
      // Bez obzira na uspeh ili gresku, sklanjamo spinner
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-4 text-center">
      <h2>Upload Image to Cloudinary</h2>

      {/* Input za izbor fajla */}
      <input
        type="file"
        onChange={handleFileUpload}
        className="form-control my-3"
        accept="image/*" // Prihvatamo samo slike
      />

      {/* Prikaz slike nakon uspesnog upload-a */}
      {isLoading && <Spinner message=""/>} {/* Prikaz spinnera tokom upload-a */}
      {imageUrl && (
        <div>
          <h3>Uploaded Image:</h3>
          <img src={imageUrl} alt="Uploaded" style={{ maxWidth: "300px" }} />
        </div>
      )}
    </div>
  );
};

export default CloudinaryUpload;
