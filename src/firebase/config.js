// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDbk4bog1pS5OzNLOhlDWQCbIkBB5QVofM",
    authDomain: "centre-mart.firebaseapp.com",
    projectId: "centre-mart",
    storageBucket: "centre-mart.appspot.com",
    messagingSenderId: "478441468038",
    appId: "1:478441468038:web:1d821edefe5279ff35a107"
};

// Initialize app, Firestore, and Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Google Sign In Function
const signInWithGoogle = async() => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
<<<<<<< HEAD
        return result;
=======
        return result.user;
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

// Named exports
export { db, auth, signInWithGoogle };