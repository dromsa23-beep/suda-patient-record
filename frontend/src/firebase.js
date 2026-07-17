import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqts51aWQzRmKkeZGBEMwBLOGhIKcVld8",
  authDomain: "suda-patient-record.firebaseapp.com",
  projectId: "suda-patient-record",
  storageBucket: "suda-patient-record.firebasestorage.app",
  messagingSenderId: "45693207256",
  appId: "1:45693207256:web:ffc199c9a2c08e39db8dad",
  measurementId: "G-RMRYFKDRR1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
