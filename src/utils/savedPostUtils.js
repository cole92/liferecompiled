import { unsavePost, savePost } from "../services/savedService";
import { showErrorToast, showInfoToast, showSuccessToast } from "./toastUtils";

/**
 * Menja status posta u sacuvano / nesacuvano za trenutno ulogovanog korisnika.
 *
 * @param {Object} user - Trenutni korisnik (mora biti autentifikovan)
 * @param {string} postId - ID posta koji se cuva ili uklanja
 * @param {boolean} isSaved - Trenutni status da li je post sacuvan
 * @returns {Promise<boolean>} - Vraca novi status (true ako je sacuvan, false ako je uklonjen)
 *
 * Ako korisnik nije ulogovan, prikazuje se toast upozorenja.
 * Ako operacija uspe, prikazuje se odgovarajuca toast poruka.
 * U slucaju greske, status ostaje nepromenjen i prikazuje se greska.
 */

export const toggleSavePost = async (user, postId, isSaved, snapshot) => {
      console.log("toggleSavePost:", { postId, isSaved, snapshot });
  if (!user) {
    return showInfoToast("Please login to save posts.");
  }

  try {
    if (isSaved) {
      await unsavePost(user.uid, postId);
      showSuccessToast("Removed from saved!");
      return false;
    } else {
      await savePost(user.uid, postId, snapshot);
      showSuccessToast("Post saved!");
      return true;
    }
  } catch (error) {
    console.error(error);
    showErrorToast("Something went wrong.");
    return isSaved;
  }
};
