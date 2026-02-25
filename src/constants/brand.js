/**
 * Central brand config used across UI (header, metadata, a11y labels).
 * Keep values stable to avoid inconsistent rendering or stale aria text.
 */
export const BRAND = {
  name: "LifeRecompiled",

  // Header wordmark is split so UI can style the accent part consistently.
  wordmark: {
    plain: "Life",
    accent: "Recompiled",
  },

  // Stored in a raw form; formatting/styling is handled by `BrandWordmark`.
  // Example: hyphen may be rendered as a visual separator (bullet) in the UI.
  tagline: "CODE-POWERED",

  // A11y: consistent navigation label for the header home link/button.
  homeAriaLabel: "Go to Home",
};
