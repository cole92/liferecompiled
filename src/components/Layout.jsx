import PropTypes from "prop-types"; // Biblioteka za validaciju props-a
import Header from "./Header";
import Footer from "./Footer";

// Layout komponenta koja obavija stranice aplikacije
const Layout = ({ children }) => {
  return (
    <div className="d-flex flex-column vh-100">
      {/* Header - fiksiran na vrhu, puni ekran */}
      <div className="container-fluid bg-light border-bottom">
        <Header />
      </div>

      {/* Glavni sadrzaj stranice (dinamican - skrolabilan, prosledjen kroz children prop) */}
      <main className="flex-grow-1 overflow-auto">
        <div className="container mt-4">{children}</div>
      </main>

      {/* Footer - fiksiran na dnu, puni ekran */}
      <div className="container-fluid bg-light border-top">
        <Footer />
      </div>
    </div>
  );
};

// Validacija props-a: children mora biti React cvor i obavezan je
Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
