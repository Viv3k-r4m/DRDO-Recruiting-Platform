import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvQ5VT1pU6VfeNgeWBlfQTUcA3gr1pY-o",
  authDomain: "drdoproject11222.firebaseapp.com",
  projectId: "drdoproject11222",
  storageBucket: "drdoproject11222.firebasestorage.app",
  messagingSenderId: "517503226807",
  appId: "1:517503226807:web:4225447f046516db5b4e32",
  measurementId: "G-XZGDP6JM9X"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

