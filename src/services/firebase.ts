import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

try {
  setLogLevel('error');
} catch (_) {}

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    console.log('Firebase connection test succeeded.');
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errObj = error as any;
    if (errObj?.code === 'resource-exhausted' || msg.includes('Quota limit exceeded') || msg.includes('resource-exhausted')) {
      console.warn('Firebase daily free quota reached. Serving persistent local storage.');
      return false;
    }
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}
