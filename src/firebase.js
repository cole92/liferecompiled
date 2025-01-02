// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeAD5opPEZbTr5i4y6NExiKIlCqXVvf2E",
  authDomain: "myblogapp-4bae3.firebaseapp.com",
  projectId: "myblogapp-4bae3",
  storageBucket: "myblogapp-4bae3.firebasestorage.app",
  messagingSenderId: "357277833359",
  appId: "1:357277833359:web:c2b6ca3c184a70815838fa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Export funkcije za odjavu korisnika
export { signOut }; 