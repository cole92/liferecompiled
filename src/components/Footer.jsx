import { BRAND } from "../constants/brand";

/**
 * @component Footer
 *
 * Application footer displayed across public and authenticated pages.
 *
 * - Shows dynamic current year (auto-updates without manual changes)
 * - Uses `BRAND.name` to stay aligned with brand configuration
 * - Includes external author link with secure target attributes
 *
 * Notes:
 * - `rel="noopener noreferrer"` prevents security risks when using `target="_blank"`
 * - Pure presentational component (no state or side effects)
 *
 * @returns {JSX.Element}
 */
const Footer = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-zinc-500">
          {/* Dynamic year prevents manual updates each calendar year */}©{" "}
          {new Date().getFullYear()} {BRAND.name} · Created by{" "}
          <a
            href="https://github.com/cole92"
            target="_blank"
            // Security: prevent access to window.opener in new tab
            rel="noopener noreferrer"
            className="font-medium text-zinc-400 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
          >
            Aleksandar Todorovic
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
