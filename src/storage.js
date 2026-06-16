// ------------------------------------------------------------------
// Storage + auth for Math Intuition Lab.
//
// Accounts: email + password (open sign-up). Same approach as Sadhana.
//
// Modes (automatic):
//   1. Firebase OFF            -> localStorage only (per device).
//   2. Firebase ON, signed out -> localStorage only, with a login form.
//   3. Firebase ON, signed in  -> Firestore under your account, synced
//                                 across every device you sign in on, with a
//                                 localStorage cache so it works offline.
//
// Create an account once, then sign in with the same email + password on any
// device and your progress is the same everywhere.
//
// The app calls:
//   storage.get(key), storage.set(key, value)
//   auth.signUp(email, pw), auth.signIn(email, pw), auth.signOutUser()
//   auth.resetPassword(email), auth.onChange(cb), auth.user()
// ------------------------------------------------------------------

import { firebaseConfig, FIREBASE_ON } from "./firebase.config";

// ---------- localStorage backend (always present) ----------
const local = {
  async get(key) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch {
      return null;
    }
  },
};

// ---------- Firebase (lazy) ----------
let fb = null;
let fbReady = null;
let currentUser = null;
const listeners = new Set();

async function loadFirebase() {
  if (fbReady) return fbReady;
  fbReady = (async () => {
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
    );
    const { getFirestore, doc, getDoc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );
    const {
      getAuth,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      sendPasswordResetEmail,
      setPersistence,
      browserLocalPersistence,
    } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const authObj = getAuth(app);
    try { await setPersistence(authObj, browserLocalPersistence); } catch {}

    onAuthStateChanged(authObj, (u) => {
      currentUser = u || null;
      listeners.forEach((cb) => cb(currentUser));
    });

    fb = {
      app, db, auth: authObj,
      doc, getDoc, setDoc,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      sendPasswordResetEmail,
    };
    return fb;
  })();
  return fbReady;
}

if (FIREBASE_ON) loadFirebase();

// turn Firebase's error codes into friendly messages
function friendly(e) {
  const c = (e && e.code) || "";
  if (c.includes("email-already-in-use")) return "That email already has an account — try signing in.";
  if (c.includes("invalid-email")) return "That doesn't look like a valid email.";
  if (c.includes("weak-password")) return "Password must be at least 6 characters.";
  if (c.includes("wrong-password") || c.includes("invalid-credential")) return "Wrong email or password.";
  if (c.includes("user-not-found")) return "No account with that email — sign up first.";
  if (c.includes("too-many-requests")) return "Too many attempts. Wait a moment and try again.";
  if (c.includes("network")) return "Network problem — check your connection.";
  return "Something went wrong. Try again.";
}

// ---------- public storage API ----------
export const storage = {
  async get(key) {
    if (FIREBASE_ON && currentUser) {
      try {
        const { db, doc, getDoc } = await loadFirebase();
        const snap = await getDoc(doc(db, "users", currentUser.uid, "kv", key));
        if (snap.exists()) {
          const v = snap.data().value;
          local.set(key, v);
          return { key, value: v };
        }
        return local.get(key);
      } catch {
        return local.get(key);
      }
    }
    return local.get(key);
  },

  async set(key, value) {
    local.set(key, value);
    if (FIREBASE_ON && currentUser) {
      try {
        const { db, doc, setDoc } = await loadFirebase();
        await setDoc(doc(db, "users", currentUser.uid, "kv", key), { value });
      } catch {
        /* offline: local cache already written */
      }
    }
    return { key, value };
  },
};

// ---------- public auth API ----------
export const auth = {
  enabled: FIREBASE_ON,
  user() {
    return currentUser;
  },
  onChange(cb) {
    listeners.add(cb);
    cb(currentUser);
    return () => listeners.delete(cb);
  },
  async signUp(email, password) {
    if (!FIREBASE_ON) return { ok: false, error: "Sync is not enabled." };
    const f = await loadFirebase();
    try {
      const res = await f.createUserWithEmailAndPassword(f.auth, email.trim(), password);
      return { ok: true, user: res.user };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    }
  },
  async signIn(email, password) {
    if (!FIREBASE_ON) return { ok: false, error: "Sync is not enabled." };
    const f = await loadFirebase();
    try {
      const res = await f.signInWithEmailAndPassword(f.auth, email.trim(), password);
      return { ok: true, user: res.user };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    }
  },
  async signOutUser() {
    if (!FIREBASE_ON) return;
    const f = await loadFirebase();
    try { await f.signOut(f.auth); } catch {}
  },
  async resetPassword(email) {
    if (!FIREBASE_ON) return { ok: false, error: "Sync is not enabled." };
    const f = await loadFirebase();
    try {
      await f.sendPasswordResetEmail(f.auth, email.trim());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    }
  },
};
