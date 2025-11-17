export function normalizePostDoc(docSnap) {
  if (!docSnap || typeof docSnap.data !== "function") {
    return null;
  }

  const data = docSnap.data() || {};
  const id = docSnap.id;

  const rawTitle = typeof data.title === "string" ? data.title.trim() : "";

  if (!id || !rawTitle) {
    return null;
  }

  const rawCreatedAt = data.createdAt;

  let createdAtDate = null;

  if (rawCreatedAt && typeof rawCreatedAt.toDate === "function") {
    const d = rawCreatedAt.toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      createdAtDate = d;
    }
  }

  if (!createdAtDate) {
    return null;
  }
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  const rawCategory =
    typeof data.category === "string"
      ? data.category.trim() || undefined
      : undefined;

  let tags = [];
  if (Array.isArray(data.tags)) {
    tags = data.tags
      .map((tag) => {
        // tags: ["js", "react"]
        if (typeof tag === "string") {
          const t = tag.trim();
          return t ? { text: t } : null;
        }

        // tags: [{ text: "js" }, { text: "react" }]
        if (tag && typeof tag.text === "string") {
          const t = tag.text.trim();
          return t ? { text: t } : null;
        }

        return null;
      })
      .filter(Boolean);
  }
  // 5) Lock info
  const locked = Boolean(data.locked);
  const lockedAt = data.lockedAt !== undefined ? data.lockedAt : null;

  // 6) User id for later author enrichment
  const userId =
    typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : null;

  const reactionCounts =
    data.reactionCounts && typeof data.reactionCounts === "object"
      ? { ...data.reactionCounts }
      : undefined;

  // 8) Comments count (optional number)
  const commentsCount =
    typeof data.commentsCount === "number" &&
    Number.isFinite(data.commentsCount)
      ? data.commentsCount
      : undefined;

  // 9) Timestamps: we keep raw Firestore Timestamps here
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
