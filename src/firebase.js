// src/firebase.js - Add these configurations
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { updateDoc, doc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrN0JwSdatph8ULZMpclA5NAeFI1gWZHI",
  authDomain: "clg-election-dc5ac.firebaseapp.com",
  projectId: "clg-election-dc5ac",
  storageBucket: "clg-election-dc5ac.firebasestorage.app",
  messagingSenderId: "563048748424",
  appId: "1:563048748424:web:948242662033674537563d",
  measurementId: "G-DZPLE3GSGV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
// For email link authentication
auth.settings = {
  // URL for password reset and email verification actions
  url: window.location.origin,
};

export { auth, db };


