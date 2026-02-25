import PropTypes from "prop-types";
import Header from "./Header";
import Footer from "./Footer";
import { SearchProvider } from "../context/SearchContext";

/**
 * @component Layout
 *
 * Application shell wrapper used across routes.
 *
 * - Provides global context via `SearchProvider`
 * - Renders consistent app chrome (Header + Footer) around route content
 * - Includes "Skip to content" link for keyboard accessibility
 * - Keeps footer pinned to bottom on short pages via flex column layout
 *
 * Notes:
 * - Header is rendered in a sticky wrapper so page content scrolls under it
 * - Main content is wrapped in `ui-shell` to keep widths consistent across pages
 *
 * @param {React.ReactNode} children - Route content
 * @returns {JSX.Element}
 */
const Layout = ({ children }) => {
  return (
    <SearchProvider>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        {/* A11y: allows keyboard users to jump past navigation */}
        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:left-1/2 focus:-translate-x-1/2
            focus:top-16 sm:focus:top-4
            focus:z-[60]
            focus:rounded-md focus:bg-zinc-900
            focus:px-2 focus:py-1 focus:text-xs
            sm:focus:px-3 sm:focus:py-2 sm:focus:text-sm
            focus:font-medium focus:text-zinc-100
            focus:max-w-[calc(100vw-2rem)] focus:truncate
          "
        >
          Skip to content
        </a>

        {/* Sticky header (body scrolls underneath) */}
        <div className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
          <Header />
        </div>

        {/* Main grows to push Footer to the bottom when content is short */}
        <main id="main-content" className="flex-1 pt-4 pb-6">
          {/* IMPORTANT: keep page width consistent across the app */}
          <div className="ui-shell">{children}</div>
        </main>

        {/* Footer */}
        <div className="w-full border-t border-zinc-800 bg-zinc-950">
          <Footer />
        </div>
      </div>
    </SearchProvider>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
