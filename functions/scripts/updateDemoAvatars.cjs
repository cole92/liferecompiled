
const path = require("path");
const admin = require("firebase-admin");

const EXPECTED_PROJECT_ID = "myblogapp-4bae3";
const SEED_BATCH_ID = "production-demo-v1";
const CONFIRM_FLAG = "--confirm-production";

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../.secrets/liferecompiled-prod.serviceAccount.json"
);

// Matches the actual demo user IDs created by seedFullDemoData.cjs.
const AVATAR_UPDATES = [
  {
    uid: "demo_luka_backend",
    name: "Luka Backend",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Luka_Backend_y6ycxk.png",
  },
  {
    uid: "demo_mina_frontend",
    name: "Mina Frontend",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Mina_Frontend_mcfw3h.png",
  },
  {
    uid: "demo_sara_ux",
    name: "Sara UX",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Sara_Product_hobuwe.png",
  },
  {
    uid: "demo_nikola_devops",
    name: "Nikola DevOps",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Ethan_Data_dc0u8e.png",
  },
  {
    uid: "demo_ana_product",
    name: "Ana Product",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Emma_UX_z57v8d.png",
  },
  {
    uid: "demo_marko_fullstack",
    name: "Marko Fullstack",
    profilePicture:
      "https://res.cloudinary.com/dm63mpfng/image/upload/v1781591107/Noah_Community_chqrho.png",
  },
];

function assertConfirmed() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    console.error(`[avatars] Refusing to run without ${CONFIRM_FLAG}`);
    process.exit(1);
  }
}

function initAdmin() {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}

async function assertProject(db) {
  const projectId = db._settings.projectId || admin.app().options.projectId;

  if (projectId !== EXPECTED_PROJECT_ID) {
    console.error(
      `[avatars] Wrong project. Expected ${EXPECTED_PROJECT_ID}, got ${projectId}`
    );
    process.exit(1);
  }

  console.log(`[avatars] Project: ${projectId}`);
}

async function main() {
  assertConfirmed();

  const db = initAdmin();
  await assertProject(db);

  console.log(`[avatars] Updating demo avatars for ${SEED_BATCH_ID}`);

  const batch = db.batch();

  for (const item of AVATAR_UPDATES) {
    const ref = db.collection("users").doc(item.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error(`[avatars] Missing demo user: ${item.uid}`);
    }

    const data = snap.data() || {};

    if (data.isDemo !== true || data.seedBatchId !== SEED_BATCH_ID) {
      throw new Error(
        `[avatars] Refusing to update non-demo or wrong-batch user: ${item.uid}`
      );
    }

    batch.update(ref, {
      profilePicture: item.profilePicture,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[avatars] Queued ${item.name} -> ${item.uid}`);
  }

  await batch.commit();

  console.log("[avatars] Done.");
}

main().catch((error) => {
  console.error("[avatars] Failed:", error);
  process.exit(1);
});
