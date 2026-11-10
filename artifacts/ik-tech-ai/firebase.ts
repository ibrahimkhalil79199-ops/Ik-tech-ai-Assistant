import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNTSmTDCaGzzTOFXhErDAK7wgYZMwzp34",
  authDomain: "ik-tech-ai.firebaseapp.com",
  projectId: "ik-tech-ai",
  storageBucket: "ik-tech-ai.firebasestorage.app",
  messagingSenderId: "1088782319826",
  appId: "1:1088782319826:web:2c41f95d7435a786f1ad0b",
  measurementId: "G-LXJXNJRJ4Q",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;