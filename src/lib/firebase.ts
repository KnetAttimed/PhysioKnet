import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const toggleLearnedTopic = async (userId: string, topicKey: string, isLearned: boolean) => {
  const docRef = doc(db, "users", userId, "progress", "main");
  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { learnedTopics: isLearned ? [topicKey] : [] });
    } else {
      await updateDoc(docRef, {
        learnedTopics: isLearned ? arrayUnion(topicKey) : arrayRemove(topicKey)
      });
    }
  } catch (error) {
    console.error("Error updating progress in Firestore:", error);
    throw error;
  }
};

export const subscribeToProgress = (userId: string, onUpdate: (topics: string[]) => void) => {
  import("firebase/firestore").then(({ onSnapshot, doc }) => {
    const docRef = doc(db, "users", userId, "progress", "main");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data().learnedTopics || []);
      } else {
        onUpdate([]);
      }
    }, (error) => {
      console.error("Error fetching progress snapshot:", error);
    });
  });
};
