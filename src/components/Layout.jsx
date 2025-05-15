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
    // Omotavamo celu aplikaciju unutar SearchProvider-a
    <SearchProvider>
      <div className="d-flex flex-column vh-100">
        {/* Header se prikazuje na svim stranicama */}
        <div className="container-fluid bg-light border-bottom">
          <Header />
        </div>
        {/* Glavni sadrzaj stranice (dinamicki menja stranice unutar aplikacije) */}
        <main className="flex-grow-1 overflow-auto">
          {/* Glavni wrapper: full-width za dashboard, centriran za ostale stranice */}
          <div
            className={isDashboard ? "container-fluid mt-4" : "container mt-4"}
          >
            {children}
          </div>
        </main>
        {/* Footer se prikazuje na svim stranicama */}
        <div className="container-fluid bg-light border-top">
          <Footer />
        </div>
      </div>
    </SearchProvider>
  );
};

// Validacija props-a - children mora biti React element
Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
