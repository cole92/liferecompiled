import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import Header from "./Header";
import Footer from "./Footer";
import { SearchProvider } from "../context/SearchContext";

/**
 * Layout komponenta - sluzi kao glavni omotac aplikacije.
 * Sadrzi Header, Footer i dinamicki sadrzaj (children),
 * koji se menja u zavisnosti od rute.
 */
const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <SearchProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-100"
        >
          Skip to content
        </a>

        <div className="w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
          <Header />
        </div>

        <main id="main-content" className="flex-1 overflow-auto">
          <div
            className={
              isDashboard
                ? "w-full px-4 py-6 sm:px-6 lg:px-8"
                : "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
            }
          >
            {children}
          </div>
        </main>

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
