import { Cloudinary } from "@cloudinary/url-gen";
import { AdvancedImage } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";

/**
 * @component CloudinaryPreview
 *
 * Simple Cloudinary smoke-test component used during setup/debugging.
 *
 * - Initializes Cloudinary client from `VITE_CLOUDINARY_CLOUD_NAME`
 * - Renders a known sample asset with a deterministic resize transformation
 * - Returns null if Cloudinary config is missing (fail fast in dev)
 *
 * Notes:
 * - This is intended for local verification, not production UI.
 */
const CloudinaryPreview = () => {
  // Initialize Cloudinary client using env config
  const cld = new Cloudinary({
    cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME },
  });

  // Guard: do not attempt rendering if cloudName is missing
  if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
    console.error("Cloudinary Cloud Name is not defined!");
    return null;
  }

  // Use a known public sample image for predictable testing
  const img = cld
    .image("cld-sample-4")
    // Deterministic transform: fixed square preview for visual confirmation
    .resize(fill().width(300).height(300));

  return (
    <div className="mx-auto mt-4 w-full max-w-3xl px-4 text-center">
      <h2>Test Cloudinary Image</h2>

      {/* Render via Cloudinary React SDK */}
      <AdvancedImage cldImg={img} />
    </div>
  );
};

export default CloudinaryPreview;
