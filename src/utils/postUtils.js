/**
 * Proverava da li je post automatski zakljucan na osnovu datuma kreiranja.
 *
 * - Post se smatra zakljucanim ako je proslo vise od 7 dana od njegovog kreiranja.
 * - Ako `createdAt` nije validan Firestore Timestamp objekat, vraca false.
 *
 * @function
 * @param {object} createdAt - Firestore Timestamp objekat (mora imati metodu toDate)
 * @returns {boolean} - Da li je post automatski zakljucan
 */


export const isAutoLocked = (createdAt) => {
  if (!createdAt?.toDate) return false;
  const createdDate = createdAt.toDate();
  return Date.now() > createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
};
