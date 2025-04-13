import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin only on the server side
let firestoreDB: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;

if (typeof window === 'undefined') {
  try {
    if (!getApps().length) {
      // Check if we have all required environment variables
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase Admin environment variables');
      }

      console.log('Initializing Firebase Admin with project:', projectId);
      
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }

    firestoreDB = getFirestore(getApp());
    auth = getAuth(getApp());
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
    throw new Error('Failed to initialize Firebase Admin: Unknown error');
  }
}

export { firestoreDB, auth };
