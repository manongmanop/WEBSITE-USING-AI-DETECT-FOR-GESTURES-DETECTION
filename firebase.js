// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAie6Vcgbp0knRiCT7z-Y2nun5y9r1z_1o",
  authDomain: "exerciseli-87fd0.firebaseapp.com",
  projectId: "exerciseli-87fd0",
  storageBucket: "exerciseli-87fd0.firebasestorage.app",
  messagingSenderId: "97219245286",
  appId: "1:97219245286:web:7fec41cfbe9fe37ef43727",
  measurementId: "G-BNGVKMC8Y2"
};

// These will be initialized asynchronously but exported statically for compatibility
export let app;
export let auth;
export let db;
export let analytics;

export const initFirebase = async () => {
  if (app) return { app, auth, db, analytics };

  // Dynamic imports for lazy loading
  const [{ initializeApp }, { getAuth }, { getFirestore }, { getAnalytics }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/analytics")
  ]);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  analytics = getAnalytics(app);

  return { app, auth, db, analytics };
};

// Functions to get instances, ensuring they are initialized (for new code)
export const getAuthInstance = async () => {
  if (!auth) await initFirebase();
  return auth;
};

export const getDbInstance = async () => {
  if (!db) await initFirebase();
  return db;
};
