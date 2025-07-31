import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useState, useEffect } from "react";

/**
 * Custom React hook koji proverava da li je post sacuvan od strane korisnika.
 *
 * @param {Object|null} user - Ulogovani korisnik (ili null ako nije prijavljen)
 * @param {string|null} postId - ID posta koji se proverava
 * @returns {{ isSaved: boolean, setIsSaved: function }} - Vraceni status i setter za lokalnu kontrolu
 *
 * Hook koristi Firestore kako bi proverio da li dokument postoji u `savedPosts` subkolekciji.
 * U slucaju da korisnik nije prijavljen ili `postId` nije poznat, proveru preskace.
 */


export const useCheckSavedStatus = (user, postId) => {
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (!user || !postId) return;

        const checkIfSaved = async () => {
            const ref = doc(db, "users", user.uid, "savedPosts", postId);
            const snap = await getDoc(ref);

            setIsSaved(snap.exists());

        }
        checkIfSaved()

    }, [user, postId])
    return { isSaved, setIsSaved };
};