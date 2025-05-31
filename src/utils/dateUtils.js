import dayjs from "dayjs";

/**
 * Vraca broj dana preostalih do trajnog brisanja posta.
 * Ako `deletedAt` ne postoji, vraca null.
 *
 * @param {firebase.firestore.Timestamp} deletedAt
 * @returns {number|null}
 */

export const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return null;

    const deletedDate = dayjs(deletedAt.toDate());
    const today = dayjs();
    const daysPassed = today.diff(deletedDate, "day");
    const daysLeft = 30 - daysPassed;

    return daysLeft >= 0 ? daysLeft : 0;
};