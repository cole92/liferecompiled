import PropTypes from "prop-types"; // Biblioteka za validaciju props-a
import Header from "./Header";
import Footer from "./Footer";

// Layout komponenta koja obavija stranice aplikacije
const Layout = ({ children }) => {
  return (
    <>
      <Header />
      {/* Glavni sadrzaj stranice (dinamican, prosledjen kroz children prop) */}
      <main className="container mt-4">{children}</main>
      <Footer />
    </>
  );
};
// Validacija props-a: children mora biti React cvor i obavezan je
Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
