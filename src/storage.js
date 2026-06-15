// ------------------------------------------------------------------
// Storage + auth for Math Intuition Lab.
//
// Three modes, automatic:
//   1. Firebase OFF            -> localStorage only (per device).
//   2. Firebase ON, signed out -> localStorage only, with a "Sign in" button.
//   3. Firebase ON, signed in  -> Firestore under your Google account,
//                                 synced across EVERY device you sign in on,
//                                 with a localStorage cache so it works offline.
//
// Sign in with the SAME Google account on your phone and laptop and the
// progress is the same on both. That is the cross-device continuity you want.
//
// The app calls: storage.get(key), storage.set(key, value),
//                auth.signIn(), auth.signOutUser(), auth.onChange(cb), auth.user()
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
      GoogleAuthProvider,
      signInWithPopup,
      signOut,
      onAuthStateChanged,
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
      provider: new GoogleAuthProvider(),
      signInWithPopup, signOut,
    };
    return fb;
  })();
  return fbReady;
}

if (FIREBASE_ON) loadFirebase();

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
  async signIn() {
    if (!FIREBASE_ON) return null;
    const f = await loadFirebase();
    try {
      const res = await f.signInWithPopup(f.auth, f.provider);
      return res.user;
    } catch {
      return null;
    }
  },
  async signOutUser() {
    if (!FIREBASE_ON) return;
    const f = await loadFirebase();
    try { await f.signOut(f.auth); } catch {}
  },
};
