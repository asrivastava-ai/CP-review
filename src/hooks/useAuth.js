import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, onAuthStateChanged, updateProfile,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADMIN_EMAIL = 'aloksrius@yahoo.com';
const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

// Save/update user profile in Firestore
async function saveUserProfile(user, provider) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    // First time login
    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email,
      photoURL: user.photoURL || '',
      provider,
      role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
      firstLogin: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  } else {
    // Update last login
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await saveUserProfile({ ...result.user, displayName: name }, 'email');
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(result.user, 'email');
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    await saveUserProfile(result.user, 'google');
    return result;
  }

  function logout() { return signOut(auth); }
  function resetPassword(email) { return sendPasswordResetEmail(auth, email); }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, register, login, loginWithGoogle, logout, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
