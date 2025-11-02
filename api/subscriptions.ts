
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initFirebaseAdmin } from './lib/firebase-admin';


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { subscription, userId, role } = req.body;

        if (!subscription || !userId || !role) {
            return res.status(400).json({ message: 'Subscription, userId, and role are required.' });
        }

        initFirebaseAdmin();
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
