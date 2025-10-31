
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';

// --- Type Duplication (necessary for serverless environment) ---
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
// --- End Type Duplication ---

// --- Firebase Admin Initialization ---
export function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    
    const projectId = process.env.GCP_PROJECT_ID || process.env.VERCEL_PROJECT_ID;

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Server configuration error: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

        if (projectId && serviceAccount.project_id !== projectId) {
            console.warn(`Project ID mismatch. Vercel Project ID: ${projectId}, Service Account Project ID: ${serviceAccount.project_id}. This may cause issues.`);
        }
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin:", e.message);
        throw new Error("Server configuration error: Could not parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it's a valid, single-line JSON string.");
    }
}

// --- Cloudinary Initialization ---
export function initializeCloudinary() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Server configuration error: Cloudinary credentials are not set.");
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// --- Push Notification Helper ---
export async function sendPushNotification(db: admin.firestore.Firestore, title: string, body: string, url: string) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
        console.warn('VAPID keys or email not set. Skipping push notification.');
        return;
    }
    
    webpush.setVapidDetails(
        `mailto:${process.env.WEB_PUSH_EMAIL}`,
        process.env.VITE_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const subscriptionsSnapshot = await db.collection('pushSubscriptions')
        .where('role', 'in', [UserRole.Admin, UserRole.Staff])
        .get();

    if (subscriptionsSnapshot.empty) {
        console.log("No push subscriptions found for admins or staff.");
        return;
    }
    
    const notificationPayload = JSON.stringify({ title, body, url });

    const sendPromises = subscriptionsSnapshot.docs.flatMap(doc => {
        const data = doc.data();
        const userSubscriptions = data.subscriptions || [];
        
        return userSubscriptions.map((subscription: any) => 
            webpush.sendNotification(subscription, notificationPayload)
                .catch(error => {
                    if (error.statusCode === 410) {
                        console.log(`Subscription for user ${doc.id} expired. Removing.`);
                        // Return a promise to update Firestore
                        return db.collection('pushSubscriptions').doc(doc.id).update({
                            subscriptions: admin.firestore.FieldValue.arrayRemove(subscription)
                        });
                    } else {
                        console.error('Error sending notification:', error);
                    }
                })
        );
    });

    await Promise.allSettled(sendPromises);
}
