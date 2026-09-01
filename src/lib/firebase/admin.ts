import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let adminApp: Promise<App> | undefined;
let adminDb: Promise<Firestore> | undefined;

async function getAdminApp(): Promise<App> {
  adminApp ??= import('firebase-admin/app').then(
    ({ cert, getApps, initializeApp }) =>
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      }),
  );

  return adminApp;
}

export async function getAdminAuth(): Promise<Auth> {
  const [{ getAuth }, app] = await Promise.all([
    import('firebase-admin/auth'),
    getAdminApp(),
  ]);
  return getAuth(app);
}

export async function getAdminDb(): Promise<Firestore> {
  adminDb ??= Promise.all([
    import('firebase-admin/firestore'),
    getAdminApp(),
  ]).then(([{ initializeFirestore }, app]) =>
    initializeFirestore(app, { preferRest: true }),
  );

  return adminDb;
}
