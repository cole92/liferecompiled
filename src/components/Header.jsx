import LeftMenu from "./Left & Right Menu/LeftMenu";
import RightMenu from "./Left & Right Menu/RightMenu";

const Header = () => {
  return (
    <header className="d-flex justify-content-between align-items-center p-2 bg-light">
      {/* Levo dugme - otvara levi offcanvas meni */}
      <button
        className="btn btn-outline-primary"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasLeft"
        aria-controls="offcanvasLeft"
      >
        <span className="navbar-toggler-icon"></span>
        {/* Ikonica za otvaranje levog menija */}
      </button>

      {/* Logo ili naslov aplikacije u centru */}
      <h1 className="fs-4 m-0">Blog App</h1>

      {/* Desno dugme - otvara desni offcanvas meni */}
      <button
        className="btn btn-outline-secondary"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasRight"
        aria-controls="offcanvasRight"
      >
        <span className="navbar-toggler-icon"></span>
        {/* Ikonica za otvaranje desnog menija */}
      </button>

      {/* Levi offcanvas meni */}
      <LeftMenu />

      {/* Desni offcanvas meni */}
      <RightMenu />
    </header>
  );
};

export default Header;
