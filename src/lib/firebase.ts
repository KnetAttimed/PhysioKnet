import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error?.code === 'auth/unauthorized-domain') {
       alert("ไม่สามารถล็อกอินได้เนื่องจากโฮสต์นี้ยังไม่ได้รับอนุญาตใน Firebase ครับ\n\nวิธีแก้: ไปที่ Firebase Console -> Authentication -> Settings -> Authorized domains แล้วเพิ่มโดเมน\n'physio-knet.vercel.app'\nและโดเมนของตัวพรีวิวนี้ลงไปครับ");
    }
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
  const path = `users/${userId}/progress/main`;
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToProgress = (userId: string, onUpdate: (topics: string[]) => void) => {
  const path = `users/${userId}/progress/main`;
  const docRef = doc(db, "users", userId, "progress", "main");
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data().learnedTopics || []);
    } else {
      onUpdate([]);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};
