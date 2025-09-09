import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";

/**
 * @component CloudinaryUpload
 *
 * Komponenta za upload slike na Cloudinary.
 *
 * - Validira tip i velicinu fajla (≤ 5MB, mora biti image/*)
 * - Salje POST request na Cloudinary API koristeci preset i cloud name iz env varijabli
 * - Prikazuje spinner tokom uploada i toaste za sve ishode
 * - Obezbedjuje callback-ove roditelju: onUploadStart, onUploadComplete(url), onUploadError
 *
 * @param {Function} onUploadComplete - Obavezan callback kada upload uspe (vraca secure_url)
 * @param {Function} [onUploadStart]  - Opcioni callback na pocetku uploada
 * @param {Function} [onUploadError]  - Opcioni callback ako upload padne
 *
 * @returns {JSX.Element}
 */

const CloudinaryUpload = ({
  onUploadComplete,
  onUploadStart,
  onUploadError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null); // cuva referencu za reset input polja

  // Handler za upload fajla
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    // Validacija fajla (postoji, tip je image/*, velicina ≤ 5MB)
    if (!file) {
      toast.error("Please select a file to upload!");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds the 5MB limit.");
      return;
    }

    // Cloudinary env varijable (preset i cloud name)
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!preset || !cloud) {
      toast.error("Cloudinary env vars missing.");
      return;
    }

    // Kreiranje formData za upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);

    setIsLoading(true);
    onUploadStart?.(); // callback roditelju

    try {
      // Slanje fajla na Cloudinary REST API
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Cloudinary vraca { error: { message } } ako nesto padne
        const msg = data?.error?.message || "Upload failed";
        onUploadError?.();
        toast.error(msg);
        return;
      }

      // Uspeh → pozovi roditeljski callback sa secure_url
      onUploadComplete?.(data.secure_url);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      // Greska u fetch ili mrezi
      onUploadError?.();
      toast.error("Upload failed. Please try again.");
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
      // Reset input polja da bi isti fajl mogao ponovo da se odabere
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="container mt-4 text-center">
      <h2>Upload Image to Cloudinary</h2>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileUpload}
        className="form-control my-3"
        accept="image/*"
      />
      {isLoading && <Spinner message="" />}
    </div>
  );
};

CloudinaryUpload.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  onUploadStart: PropTypes.func,
  onUploadError: PropTypes.func,
};

export default CloudinaryUpload;
