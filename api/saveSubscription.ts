
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin(): admin.app.App {
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
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin:", e.message);
        throw new Error("Server configuration error: Could not parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it's a valid, single-line JSON string.");
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { subscription, userId, role } = req.body;

        if (!subscription || !userId || !role) {
            return res.status(400).json({ message: 'Subscription, userId, and role are required.' });
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();

        // Store the subscription in a dedicated collection, keyed by user ID
        // This allows a user to have subscriptions on multiple devices
        const subscriptionRef = db.collection('pushSubscriptions').doc(userId);
        
        await subscriptionRef.set({
            subscriptions: admin.firestore.FieldValue.arrayUnion(subscription),
            role: role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, message: 'Subscription saved successfully.' });

    } catch (error: any) {
        console.error('Error saving push subscription:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
