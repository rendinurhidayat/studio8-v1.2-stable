
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initFirebaseAdmin } from '../lib/firebase-admin.js';

// --- Main Handler --- 


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { subscription, userId, role } = req.body;

        if (!subscription || !userId || !role) {
            return res.status(400).json({ message: 'Payload tidak lengkap. `subscription`, `userId`, dan `role` wajib diisi.' });
        }
        
        // Basic validation for the subscription object
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return res.status(400).json({ message: 'Objek `subscription` tidak valid.' });
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

        return res.status(200).json({ success: true, message: 'Langganan notifikasi berhasil disimpan.' });

    } catch (error: any) {
        console.error('Error saving push subscription:', error);
        return res.status(500).json({ message: 'Gagal menyimpan langganan notifikasi di server.', error: error.message });
    }
}
