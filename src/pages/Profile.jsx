const Profile = () => {
  return (
    <div className="container mt-4">
      {/* Gornji deo: Profilna slika centrirana */}
      <div className="text-center mb-4">
        <img
          src="https://via.placeholder.com/150"
          alt="Profile pic"
          className="rounded-circle"
          style={{ width: "150px", height: "150px" }}
        />
      </div>

      {/* Srednji deo: Dva stupca - Levo i Desno */}
      <div className="row mb-4">
        {/* Leva sekcija */}
        <div className="col-md-6 text-center text-md-start">
          <h4>John Doe</h4>
          <p>Email: john.doe@example.com</p>
        </div>

        {/* Desna sekcija */}
        <div className="col-md-6 text-center text-md-end">
          <p>Account Created: Jan 1, 2023</p>
          <p>Status: Active</p>
        </div>
      </div>

      {/* Donji deo: Biografija i dugme */}
      <div className="text-center">
        <p>
          Bio: A passionate developer eager to learn and build amazing
          applications.
        </p>
        <button className="btn btn-primary">Edit Profile</button>
      </div>
    </div>
  );
};

export default Profile;
