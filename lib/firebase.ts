import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCHHWnzpQyXxDBNq0MmxFZYwnytwuo_bFc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mypotfolio-c060d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mypotfolio-c060d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mypotfolio-c060d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "387270094346",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:387270094346:web:743e6ca8c0a4ccbb5e39f3",
  measurementId: "G-QS79Y7ZQFG"
};

// Initialize Firebase safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface QueryItem {
  id?: string;
  topic: string;
  userQuery: string;
  answer: string;
  buttonName?: string;
  buttonLink?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatLogItem {
  id?: string;
  userMessage: string;
  aiResponse: string;
  buttonName?: string;
  buttonLink?: string;
  source?: 'database' | 'groq' | 'gemini' | 'fallback';
  timestamp?: any;
  rollNo?: string;
}

// Subscribe to real-time queries
export function subscribeToQueries(callback: (queries: QueryItem[]) => void) {
  try {
    const q = query(collection(db, 'queries'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: QueryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as QueryItem);
      });
      callback(items);
    }, (error) => {
      console.warn("Firestore queries snapshot error:", error);
      callback([]);
    });
  } catch (err) {
    console.error("Failed to subscribe to queries:", err);
    return () => {};
  }
}

function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

// Add query
export async function addQueryDoc(data: Omit<QueryItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addDoc(collection(db, 'queries'), {
    ...removeUndefinedFields(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// Update query
export async function updateQueryDoc(id: string, data: Partial<QueryItem>) {
  const docRef = doc(db, 'queries', id);
  return await updateDoc(docRef, {
    ...removeUndefinedFields(data),
    updatedAt: serverTimestamp()
  });
}

// Delete query
export async function deleteQueryDoc(id: string) {
  const docRef = doc(db, 'queries', id);
  return await deleteDoc(docRef);
}

// Delete chat log
export async function deleteChatLogDoc(id: string) {
  const docRef = doc(db, 'chat_logs', id);
  return await deleteDoc(docRef);
}

// Save chat log
export async function saveChatLog(log: ChatLogItem) {
  try {
    return await addDoc(collection(db, 'chat_logs'), {
      ...removeUndefinedFields(log),
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Could not log chat to Firestore:", err);
  }
}

// Subscribe to live chat logs
export function subscribeToChatLogs(callback: (logs: ChatLogItem[]) => void) {
  try {
    const q = query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: ChatLogItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ChatLogItem);
      });
      callback(items);
    }, (err) => {
      console.warn("Chat logs snapshot error:", err);
      callback([]);
    });
  } catch (err) {
    console.error("Failed to subscribe to chat logs:", err);
    return () => {};
  }
}

// Save OTP to Firestore
export async function saveOtpToDatabase(otp: string) {
  const docRef = doc(db, 'admin_settings', 'current_otp');
  await setDoc(docRef, { code: otp, timestamp: serverTimestamp() });
}

// Verify OTP from Firestore
export async function verifyOtpFromDatabase(inputOtp: string) {
  const docRef = doc(db, 'admin_settings', 'current_otp');
  const snap = await getDoc(docRef);
  if (snap.exists() && snap.data().code === inputOtp) {
    return true;
  }
  return false;
}

