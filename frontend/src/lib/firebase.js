import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBOuqk_TVPfYjogKJtmdQzR_q0gEPJ7El0",
  authDomain: "mentoroid-315b1.firebaseapp.com",
  projectId: "mentoroid-315b1",
  storageBucket: "mentoroid-315b1.firebasestorage.app",
  messagingSenderId: "705699761412",
  appId: "1:705699761412:web:541bf7abb6e36be3df9451",
  measurementId: "G-CNW2ZNV9B6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
