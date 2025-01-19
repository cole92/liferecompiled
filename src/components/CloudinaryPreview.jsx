import { Cloudinary } from "@cloudinary/url-gen";
import { AdvancedImage } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";

const CloudinaryPreview = () => {
  // Inicijalizacija Cloudinary instance pomocu cloudName iz .env fajla
  const cld = new Cloudinary({
    cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME },
  });
  // Provera da li je cloudName definisan
  if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
    console.error("Cloudinary Cloud Name is not defined!");
    return null;
  }

  // Kreiranje instance slike iz Cloudinary Media Library
  const img = cld
    .image("cld-sample-4") // Slika iz Media Library
    .resize(fill().width(300).height(300)); // Transformacija slike
  return (
    <div className="container mt-4 text-center">
      <h2>Test Cloudinary Image</h2>
      {/* Prikaz slike koriscenjem AdvancedImage komponente */}
      <AdvancedImage cldImg={img} />
    </div>
  );
};

export default CloudinaryPreview;
