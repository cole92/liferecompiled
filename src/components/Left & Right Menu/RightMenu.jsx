import { Link } from "react-router-dom";

{/* Desni offcanvas meni */}
const RightMenu = () => {
  return (
    <div
      className="offcanvas offcanvas-end"
      tabIndex="-1"
      id="offcanvasRight"
      aria-labelledby="offcanvasRightLabel"
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title" id="offcanvasRightLabel">
          Profile Menu
        </h5>
        <button
          type="button"
          className="btn-close text-reset"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body">
        <ul className="navbar-nav">
          {/* Navigacioni linkovi za profil meni */}
          <li className="nav-item">
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/my-posts" className="nav-link">
              My Posts
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/help" className="nav-link">
              Help
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RightMenu;
