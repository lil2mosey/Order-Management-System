import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAFAMUh7twNiPpUV5ylHCixLg16ungVPb0",
  authDomain: "musa-fe98d.firebaseapp.com",
  projectId: "musa-fe98d",
  storageBucket: "musa-fe98d.firebasestorage.app",
  messagingSenderId: "1047385381481",
  appId: "1:1047385381481:web:30455c50b9d82f850220f8",
  measurementId: "G-9H6CZ0G0S5"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);