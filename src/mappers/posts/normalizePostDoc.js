/**
 * @helper normalizePostDoc
 * Pretvara Firestore docSnap u stabilan UI shape ili vraca null ako osnovna polja fale.
 *
 * Namena:
 * - Sanira nekonzistentne dokumente (prazan title, nevalidan timestamp, losi tagovi).
 * - Vraca samo minimalni, validni skup polja za prikaz u UI feed-u.
 *
 * Uslovi za validan post:
 * - post.id mora postojati
 * - title mora biti ne-prazan string
 * - createdAt mora biti validan Firestore Timestamp (konvertibilan u Date)
 *
 * Napomena:
 * - Ne obogacuje autora; userId se vraca samo kao string i kasnije se radi enrich.
 * - Zadrzava raw Timestamp objekte (createdAt, updatedAt).
 *
 * @param {DocumentSnapshot} docSnap - Firestore snapshot
 * @returns {Object|null} normalizovan post ili null ako su minimalni uslovi neispunjeni
 */
export function normalizePostDoc(docSnap) {
  // Snapshot mora postojati i imati .data() metod
  if (!docSnap || typeof docSnap.data !== "function") {
    return null;
  }

  const data = docSnap.data() || {};
  const id = docSnap.id;

  // Title mora biti string koji nakon trim-a nije prazan
  const rawTitle = typeof data.title === "string" ? data.title.trim() : "";
  if (!id || !rawTitle) {
    return null;
  }

  // createdAt mora biti validan Firestore Timestamp
  const rawCreatedAt = data.createdAt;
  let createdAtDate = null;

  if (rawCreatedAt && typeof rawCreatedAt.toDate === "function") {
    const d = rawCreatedAt.toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      createdAtDate = d; // validan datum
    }
  }

  // Ako nemamo validan timestamp → post se smatra neispravnim
  if (!createdAtDate) {
    return null;
  }

  // Description je opcion, sanitizovan string
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  // Category: string bez praznog rezultata; undefined ako nema kategorije
  const rawCategory =
    typeof data.category === "string"
      ? data.category.trim() || undefined
      : undefined;

  // Tags – robustna normalizacija oba formata:
  // - ["js", "react"]
  // - [{ text: "js" }, { text: "react" }]
  let tags = [];
  if (Array.isArray(data.tags)) {
    tags = data.tags
      .map((tag) => {
        if (typeof tag === "string") {
          const t = tag.trim();
          return t ? { text: t } : null;
        }
        if (tag && typeof tag.text === "string") {
          const t = tag.text.trim();
          return t ? { text: t } : null;
        }
        return null;
      })
      .filter(Boolean);
  }

  // Locked status (UI koristi za disable komentara i editovanja)
  const locked = Boolean(data.locked);
  // lockedAt moze biti Timestamp ili null; ne validiramo jer UI to vec radi
  const lockedAt = data.lockedAt !== undefined ? data.lockedAt : null;

  // userId – sanitizovan string; null ako fali → kasnije fallback autor
  const userId =
    typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : null;

  // reactionCounts – kopiramo objekat ako postoji
  const reactionCounts =
    data.reactionCounts && typeof data.reactionCounts === "object"
      ? { ...data.reactionCounts }
      : undefined;

  // commentsCount – opcion, mora biti broj
  const commentsCount =
    typeof data.commentsCount === "number" &&
    Number.isFinite(data.commentsCount)
      ? data.commentsCount
      : undefined;

  // Raw Firestore timestamps (cuva se original, UI radi toDate po potrebi)
  const createdAt = rawCreatedAt;
  const updatedAt = data.updatedAt !== undefined ? data.updatedAt : null;

  return {
    id,
    userId,
    title: rawTitle,
    description,
    createdAt,
    updatedAt,
    category: rawCategory,
    tags,
    reactionCounts,
    commentsCount,
    locked,
    lockedAt,
  };
}
