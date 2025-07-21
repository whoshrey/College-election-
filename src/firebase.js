// src/firebase.js - Add these configurations
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { updateDoc, doc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "your_auth_domain",
  projectId: "your_project_id",
  storageBucket: "your_storage_bucket",
  messagingSenderId: "your_messaging_sender_id",
  appId: "your_app_id",
  measurementId: "your_measurement_id"
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


