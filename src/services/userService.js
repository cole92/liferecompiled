// services/userService.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/**
 * @helper makeFallbackAuthor
 * Gradi UI-safe oblik autora kada profil ne postoji ili je obrisan.
 *
 * Namena:
 * - Spreci lomljenje UI kada user dokument nedostaje ili je nedostupan.
 * - Omoguci dosledan prikaz "Unknown author" bez Link-a i bez bedzeva.
 *
 * Pravila:
 * - id = null → sentinel: ne koristi se za navigaciju/profil rute.
 * - badges = prazno: ne prikazujemo bedzeve za fallback autora.
 *
 * @returns {Object} fallback autor shape
 */
const makeFallbackAuthor = () => ({
  id: null, // sentinel: nema profila → ne renderuj Link
  name: "Unknown author",
  profilePicture: DEFAULT_PROFILE_PICTURE,
  badges: {}, // ne prikazuj bedzeve za Unknown autora
  deleted: true,
});

/**
 * @helper normalizeAuthor
 * Normalizuje postojeci user dokument u UI shape.
 *
 * Namena:
 * - Osigura da osnovna polja uvek postoje (name, profilePicture, deleted).
 * - Doda uid kao id u autor objektu radi lakse upotrebe u komponentama.
 *
 * Fallback:
 * - Ako nema imena ili slike, koristi default vrednosti.
 *
 * @param {string} uid - user id iz Firestore dokumenta
 * @param {Object} data - raw podaci iz Firestore user dokumenta
 * @returns {Object} normalizovan autor shape
 */
const normalizeAuthor = (uid, data) => ({
  id: uid,
  name: data?.name || "Unknown author",
  profilePicture: data?.profilePicture || DEFAULT_PROFILE_PICTURE,
  badges: typeof data?.badges === "object" && data?.badges ? data.badges : {},
  deleted: false,
});

/**
 * @helper getUserById
 * Dohvata korisnika ili vraca fallback; nikad ne baca gresku, uvek vraca "safe" shape.
 *
 * Namena:
 * - Koristi se kada je autor potreban na UI-u, ali ne zelimo da lomimo stranicu
 *   zbog lose referenciranog ili obrisanog user dokumenta.
 *
 * Ponasanje:
 * - Ako userId nedostaje → vraca fallback autora.
 * - Ako dokument ne postoji → vraca fallback autora.
 * - Ako dodje do greske (mreza, rules, itd.) → loguje i vraca fallback.
 *
 * @param {string|null|undefined} userId - id korisnika koga trazimo
 * @returns {Promise<Object>} autor shape (normalizovan ili fallback)
 */
export const getUserById = async (userId) => {
  try {
    if (!userId) return makeFallbackAuthor();

    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return makeFallbackAuthor();

    return normalizeAuthor(snap.id, snap.data());
  } catch (error) {
    console.error("Error fetching user:", error);
    return makeFallbackAuthor();
  }
};

/**
 * @helper enrichPostWithAuthor
 * Obogacuje post autor objektom; nikad ne baca, uvek vraca "safe" post+author shape.
 *
 * Namena:
 * - Na UI-u zelimo da svaki post ima `post.author`, cak i kada user dokument ne postoji.
 *
 * Ponasanje:
 * - Pokusava da dovuce autora preko `post.userId`.
 * - Ako getUserById baci ili vrati fallback, rezultat je i dalje validan za prikaz.
 * - U najgorem slucaju vraca post sa fallback autorom (Unknown author).
 *
 * Napomena:
 * - Ne menja semu posta; samo dodaje/overridu-je polje `author`.
 *
 * @param {Object} post - originalni post objekat (ocekuje se polje userId)
 * @returns {Promise<Object>} post prosiren sa `author` poljem
 */
export const enrichPostWithAuthor = async (post) => {
  try {
    const author = await getUserById(post.userId);

    return {
      ...post,
      author,
    };
  } catch (error) {
    console.error("Author fetch failed in enrichPostWithAuthor:", error);

    return {
      ...post,
      author: makeFallbackAuthor(),
    };
  }
};
