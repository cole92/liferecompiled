// Sidebar komponenta
const Sidebar = () => {
  return (
    <aside className="bg-light p-3">
      <h4>Dashboard Navigation</h4>
      <ul className="nav flex-column">
        <li className="nav-item">
          <a href="#posts" className="nav-link">
            Moji postovi
          </a>
        </li>
        <li className="nav-item">
          <a href="#create" className="nav-link">
            Kreiraj novi post
          </a>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
