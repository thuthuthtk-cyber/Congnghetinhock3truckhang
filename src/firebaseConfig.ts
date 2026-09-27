import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDkZzAtg7LAbw43_LTc2VdkWgMvLCzKcEY",
  authDomain: "day-hoc-tin-hoc-cong-nghe.firebaseapp.com",
  projectId: "day-hoc-tin-hoc-cong-nghe",
  storageBucket: "day-hoc-tin-hoc-cong-nghe.firebasestorage.app",
  messagingSenderId: "517075411345",
  appId: "1:517075411345:web:b35bc7ca8e956a5cbdfa30",
  measurementId: "G-46DB4V47YW"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
