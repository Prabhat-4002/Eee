
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUs2vWOdKQtmpKRFr70LI6r-XkTKl2eqM",
  authDomain: "quick-food-delivery-ce161.firebaseapp.com",
  databaseURL: "https://quick-food-delivery-ce161-default-rtdb.firebaseio.com",
  projectId: "quick-food-delivery-ce161",
  storageBucket: "quick-food-delivery-ce161.firebasestorage.app",
  messagingSenderId: "218176321866",
  appId: "1:218176321866:web:4d48bf480d856b700d69b3",
  measurementId: "G-WS1JETHNLX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, analytics };
