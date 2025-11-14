// src/dev/DevHomeFeedTest.jsx
import { useEffect } from "react";
import { getPostsPage } from "../services/homeFeed/getPostsPage"; // prilagodi putanju

export default function DevHomeFeedTest() {
  useEffect(() => {
    let canceled = false;

    async function runTests() {
      try {
        console.log("[DEV] Home feed test start");

        // 1) Prva strana - newest
        const page1 = await getPostsPage({
          afterDoc: null,
          pageSize: 5,
          category: null,
          sortBy: "newest",
        });

        if (canceled) return;

        console.log("[DEV] page1 (newest):");
        console.log("  size:", page1.items.length);
        console.log("  ids:", page1.items.map((p) => p.id));
        console.log("  hasMore:", page1.hasMore);

        // 2) Ako ima jos - druga strana sa kursorom
        if (page1.hasMore && page1.lastDoc) {
          const page2 = await getPostsPage({
            afterDoc: page1.lastDoc,
            pageSize: 3,
            category: null,
            sortBy: "newest",
          });

          if (canceled) return;

          console.log("[DEV] page2 (newest):");
          console.log("  size:", page2.items.length);
          console.log("  ids:", page2.items.map((p) => p.id));
          console.log("  hasMore:", page2.hasMore);
        }

        // 3) Opcioni test za "oldest"
        const oldestPage = await getPostsPage({
          afterDoc: null,
          pageSize: 3,
          category: null,
          sortBy: "oldest",
        });

        if (canceled) return;

        console.log("[DEV] page1 (oldest):");
        console.log("  size:", oldestPage.items.length);
        console.log("  ids:", oldestPage.items.map((p) => p.id));
        console.log("  hasMore:", oldestPage.hasMore);
      } catch (e) {
        console.error("[DEV] Home feed test error:", e);
      }
    }

    runTests();

    return () => {
      canceled = true;
    };
  }, []);

  // Nema UI – ovo je samo dev test
  return null;
}
