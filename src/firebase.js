import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Je eigen configuratie (laat deze staan zoals je hem had)
const firebaseConfig = {
  apiKey: "AIzaSyCQyGS486-RohBd3FHBQENIhH0PSkInwBs",
  authDomain: "expothearchive.firebaseapp.com",
  projectId: "expothearchive",
  storageBucket: "expothearchive.firebasestorage.app",
  messagingSenderId: "18895439101",
  appId: "1:18895439101:web:c17f8c3e565147f7396a94"
};

const app = initializeApp(firebaseConfig);

// Exporteer alles wat we nodig hebben
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();