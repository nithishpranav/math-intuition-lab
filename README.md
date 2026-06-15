# Math Intuition Lab

An interactive, all-in-one curriculum + visualizer + quiz for ML / applied-scientist
interview prep. 26 chapters, 16 interactive tabs, ~99 quiz questions. Progress is saved.

---

## 1. Run it on your desktop (2 minutes)

You need [Node.js](https://nodejs.org) (LTS) installed. Then, in this folder:

```bash
npm install      # one time
npm run dev      # starts a local server
```

Open the URL it prints (usually http://localhost:5173). That's it — it runs in
your browser. Progress saves to this browser via localStorage automatically.

To make a static build you can open or host anywhere:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the built version locally to check it
```

---

## 2. Host it free on GitHub Pages

1. Create a new GitHub repo (e.g. `math-intuition-lab`) and push this folder:
   ```bash
   git init
   git add .
   git commit -m "Math Intuition Lab"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/math-intuition-lab.git
   git push -u origin main
   ```
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys
   automatically on every push. After it finishes (Actions tab → green check),
   your site is live at:
   ```
   https://YOUR_USERNAME.github.io/math-intuition-lab/
   ```

`vite.config.js` already uses `base: "./"`, so relative asset paths work under the
`/repo-name/` subpath with no extra config.

---

## 3. Optional: Firebase backend for cross-device sync (phone <-> laptop)

By default, progress is stored per-browser with localStorage -- it persists across
reloads and closing the tab, but lives on one device. To share the SAME progress
across your phone and laptop, add a free Firebase backend with Google sign-in.
Sign in with the same Google account on both devices and they stay in sync.

1. Go to https://console.firebase.google.com -> **Add project** (free Spark plan).
   Disable Analytics; you don't need it.
2. **Build -> Firestore Database -> Create database** -> *production mode* ->
   pick a region near you.
3. **Build -> Authentication -> Get started -> Sign-in method -> Google -> Enable.**
   Set a support email when prompted -> Save. (Google sign-in is what lets two
   different devices resolve to the same account -- anonymous auth cannot.)
4. **Project settings (gear) -> Your apps -> Web (</>)** -> register an app
   (don't check Hosting) -> copy the `firebaseConfig` object.
5. Paste those values into `src/firebase.config.js` and set `FIREBASE_ON = true`.
6. **Authentication -> Settings -> Authorized domains -> Add domain** and add your
   Pages domain, e.g. `YOUR_USERNAME.github.io` (localhost is allowed by default).
   Without this the sign-in popup is blocked on the live site.
7. In Firestore -> **Rules**, paste and **Publish** so each user only touches their
   own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
8. Rebuild / redeploy (`git push`). A **Sign in with Google** button appears in the
   header. Click it on each device, sign in with the same account, and chapter
   progress + quiz streak sync both ways (a green "synced" indicator confirms it).
   Signed out, it falls back to local-only with a localStorage cache, so it always
   works offline.

Storage keys: `mil:done` (chapter completion) and `mil:bestStreak`. Only
`src/storage.js` and `src/firebase.config.js` touch the backend; the app code is
backend-agnostic.

---

## Files

```
index.html              page shell
src/main.jsx            mounts the app
src/MathLab.jsx         the app: renderer + interactive tabs
src/content/topics.json    the chapters (edit this to add knowledge)
src/content/questions.json the quiz bank (edit this to add questions)
src/storage.js          storage adapter (local ⇄ Firebase)
src/firebase.config.js  paste Firebase config here (optional)
vite.config.js          build config (base path for Pages)
.github/workflows/      auto-deploy to GitHub Pages
CONTENT.md              how to add topics/questions WITHOUT touching code
```

## Content-driven: add knowledge without changing code

Chapters and quiz questions live in `src/content/*.json`, not in the code.
The app renders whatever it finds — adding a topic, a question, or a whole new
quiz category is a pure data edit, then `npm run build`. See **CONTENT.md** for
the schema. Each topic supports a 10-section format (why exists, intuition,
math, code, when-it-fails, 30s/2m/5m interview answers, sharpen-my-thinking
questions, connections, resources); sections render only when present, so sparse
topics are fine. Six flagship topics are fully enriched (marked **+deep**); the
rest carry auto-migrated content you can expand one at a time.
