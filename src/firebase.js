import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAR3_62BINzc7cqWRVWz23AsRB-4tgBlg4",
  authDomain: "geovoy-ops.firebaseapp.com",
  projectId: "geovoy-ops",
  storageBucket: "geovoy-ops.firebasestorage.app",
  messagingSenderId: "736376861035",
  appId: "1:736376861035:web:2deb1f2122cb2d99525c2e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
