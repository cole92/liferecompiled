import PropTypes from "prop-types";
import { useState } from "react";
import { FaRegLightbulb, FaFire, FaRocket, FaSave, FaBolt, FaThumbtack, FaKeyboard } from "react-icons/fa";

// Komponenta za prikaz i upravljanje reakcijama korisnika na postove
const PostReactions = ({ postId, reactions = {} }) => {
  console.log("Post ID:", postId);
  /**
   * Drzi informacije o tome da li je korisnik kliknuo na odredjenu reakciju (true/false).
   * Ovo koristimo za vizuelni prikaz aktivne/neaktivne reakcije.
   */
  const [userReactions, setUserReaction] = useState({
    idea: false,
    hot: false,
    boost: false,
    save: false,
    powerup: false,
    pinned: false,
    coding: false,
  });

   /**
   * State za broj reakcija - prikazuje koliko puta je svaka reakcija dodata.
   * Pocetne vrednosti dolaze iz `reactions`, ako postoje podaci iz Firestore-a.
   */
  const [reactionCounts, setReactionCounts] = useState({
    idea: 2,
    hot: 0,
    boost: 4,
    save: 0,
    powerup: 6,
    pinned: 1,
    coding: 0,
    ...reactions, // Ako postoje Firestore podaci, prepisi default vrednosti
  });

   /**
   * Objekat koji mapira vrste reakcija na odgovarajuce ikonice.
   * Ovo omogucava dinamicko renderovanje ispravne ikonice za svaku reakciju.
   */
  const reactionComponents = {
    idea: FaRegLightbulb,
    hot: FaFire,
    boost: FaRocket,
    save: FaSave,
    powerup: FaBolt,
    pinned: FaThumbtack,
    coding: FaKeyboard,
  };

  /**
   * Funkcija koja se poziva kada korisnik klikne na reakciju.
   * Azurira `userReactions` da oznaci da li je korisnik kliknuo na reakciju.
   * Azurira `reactionCounts` kako bi povecala/smanjila broj reakcija.
   */

  const handleReactionClick = (event, reactionType) => {
    event.stopPropagation();  // Sprecava prebacivanje na stranicu posta

    // Azuriranje userReactions - menja true/false stanje za kliknutu reakciju
    setUserReaction((prevState) => ({
      ...prevState,
      [reactionType]: !prevState[reactionType],
    }));
    // Azuriranje brojaca reakcija - povecava ili smanjuje broj na osnovu korisnickog klika
    setReactionCounts((prevCounts) => ({
      ...prevCounts,
      [reactionType]: userReactions[reactionType]
        ? prevCounts[reactionType] - 1  // Ako je vec kliknuto, smanjujemo
        : prevCounts[reactionType] + 1, // Ako nije kliknuto, povecavamo
    }));
  };

  return (
    <div className="post-reactions">
      {/* Renderujemo sve reakcije */}
      <div className="reactions-container">
        {Object.entries(reactionCounts).map(([reactionType, count]) => {
          const IconComponent = reactionComponents[reactionType]; // Dohvatamo odgovarajucu ikonicu

          return (
            <button
              key={reactionType}
              onClick={(event) => handleReactionClick(event, reactionType)}
              className="reaction-button"
              style={{ fontSize: "1.2rem", padding: "10px 15px" }}
            >
              <IconComponent className="reaction-icon" /> {/* Prikaz ikonice */}
              {count}  {/* Prikaz broja reakcija */}
            </button>
          );
        })}
      </div>
    </div>
  );
};

PostReactions.propTypes = {
  postId: PropTypes.string.isRequired, // ID posta koji povezuje reakcije sa odredjenim postom
  reactions: PropTypes.object, // Objekat koji sadrzi pocetne vrednosti broja reakcija
};

export default PostReactions;
