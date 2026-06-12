import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let firebaseAuth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
} catch (error) {
  console.warn("initializeAuth with IndexedDB failed, falling back to local/session persistence:", error);
  try {
    firebaseAuth = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence],
    });
  } catch (error2) {
    console.error("All custom persistences failed, falling back to standard getAuth:", error2);
    firebaseAuth = getAuth(app);
  }
}

export const auth = firebaseAuth;
