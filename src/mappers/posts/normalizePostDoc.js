/**
 * @helper normalizePostDoc
 * Pretvara Firestore docSnap u stabilan UI shape ili vraca null ako osnovna polja fale.
 *
 * MVP ugovor:
 * - UI UVEK dobija stabilne agregate (reactionCounts, badges)
 * - Nema undefined polja za stvari koje UI renderuje
 * - Nema klijentskog racunanja fallback-ova
 */
export function normalizePostDoc(docSnap) {
  if (!docSnap || typeof docSnap.data !== "function") {
    return null;
  }

  const data = docSnap.data() || {};
  const id = docSnap.id;

  // Title mora biti ne-prazan string
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!id || !title) return null;

  // createdAt mora biti validan Firestore Timestamp
  const rawCreatedAt = data.createdAt;
  if (!rawCreatedAt || typeof rawCreatedAt.toDate !== "function") {
    return null;
  }

  const createdAtDate = rawCreatedAt.toDate();
  if (
    !(createdAtDate instanceof Date) ||
    Number.isNaN(createdAtDate.getTime())
  ) {
    return null;
  }

  // Description (opcion)
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  // Content (MVP: uvek string, ne trimujemo da sacuvamo formatiranje)
  const content = typeof data.content === "string" ? data.content : "";

  // Category (opcion)
  const category =
    typeof data.category === "string" && data.category.trim()
      ? data.category.trim()
      : undefined;

  // Tags (legacy-safe)
  const tags = Array.isArray(data.tags)
    ? data.tags
        .map((tag) => {
          if (typeof tag === "string" && tag.trim()) {
            return { text: tag.trim() };
          }
          if (tag?.text && typeof tag.text === "string" && tag.text.trim()) {
            return { text: tag.text.trim() };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  // userId (ne obogacuje se ovde)
  const userId =
    typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : null;

  // 🔥 MVP: STABILNI AGREGATI (backend authoritative)
  const reactionCounts = {
    idea: Number.isFinite(data.reactionCounts?.idea)
      ? data.reactionCounts.idea
      : 0,
    hot: Number.isFinite(data.reactionCounts?.hot)
      ? data.reactionCounts.hot
      : 0,
    powerup: Number.isFinite(data.reactionCounts?.powerup)
      ? data.reactionCounts.powerup
      : 0,
  };

  const badges = {
    mostInspiring: Boolean(data.badges?.mostInspiring),
    trending: Boolean(data.badges?.trending),
  };

  const lastHotAt =
    data.lastHotAt && typeof data.lastHotAt.toDate === "function"
      ? data.lastHotAt
      : null;

  const commentsCount = Number.isFinite(data.commentsCount)
    ? data.commentsCount
    : 0;

  const locked = Boolean(data.locked);
  const lockedAt = data.lockedAt ?? null;

  return {
    id,
    userId,
    title,
    description,
    content,
    category,
    tags,

    createdAt: rawCreatedAt,
    updatedAt: data.updatedAt ?? null,

    reactionCounts,
    badges,
    lastHotAt,
    commentsCount,

    locked,
    lockedAt,
  };
}
