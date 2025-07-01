import dayjs from "dayjs";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    increment,
} from "firebase/firestore";

import { db } from "../firebase";


/**
 * Azurira statistiku korisnika prilikom kreiranja novog posta.
 *
 * - Ako dokument u `userStats/{userId}` vec postoji:
 *   → Inkrementira ukupan broj postova i broj postova za tekuci mesec.
 * - Ako dokument ne postoji:
 *   → Kreira novi dokument sa pocetnim vrednostima.
 *
 * @async
 * @function updateUserStats
 * @param {string} userId - ID korisnika koji kreira post
 * @param {Timestamp} createdAt - Datum i vreme kada je post kreiran (Firestore Timestamp)
 *
 * @returns {Promise<void>}
 */


export const updateUserStats = async (userId, createdAt) => {

    const month = dayjs(createdAt.toDate()).format("YYYY-MM");

    const statsRef = doc(db, "userStats", userId);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
        await updateDoc(statsRef, {
            [`postsPerMonth.${month}`]: increment(1),
            totalPosts: increment(1),
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(statsRef, {
            totalPosts: 1,
            postsPerMonth: {
                [month]: 1
            },
            restoredPosts: 0,
            permanentlyDeletedPosts: 0, 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
        console.log("User stats updated for:", month);
    }
};