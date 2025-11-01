
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
// Fix: Removed .ts extension for proper module resolution.
import { initializeFirebaseAdmin } from './_lib/services';

// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;

    if (!action) {
        return res.status(400).json({ message: 'Action is required.' });
    }

    try {
        initializeFirebaseAdmin();
        const db = admin.firestore();
        const auth = admin.auth();

        switch (action) {
            case 'create': {
                const { userData, currentUserId } = payload;
                if (!userData || !currentUserId) {
                    return res.status(400).json({ message: 'userData and currentUserId are required.' });
                }

                const currentUserDoc = await db.collection('users').doc(currentUserId).get();
                if (!currentUserDoc.exists || currentUserDoc.data()?.role !== 'Admin') {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to create users.' });
                }
                
                if (!userData.password) {
                    return res.status(400).json({ message: 'Password is required to create a new user.' });
                }

                const { password, ...userDataForFirestore } = userData;
                if (userDataForFirestore.username) {
                    userDataForFirestore.username = userDataForFirestore.username.toLowerCase();
                }

                const newUserRecord = await auth.createUser({
                    email: userData.email,
                    password: userData.password,
                    displayName: userData.name,
                    photoURL: userData.photoURL || undefined,
                });
                
                await db.collection('users').doc(newUserRecord.uid).set(userDataForFirestore);
                
                await db.collection('activity_logs').add({
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    userId: currentUserId,
                    userName: currentUserDoc.data()?.name || 'Unknown Admin',
                    action: 'Membuat Pengguna Baru',
                    details: `Pengguna ${userData.name} (${userData.role}) telah dibuat.`
                });
                
                const createdUser = { id: newUserRecord.uid, ...userDataForFirestore };
                return res.status(200).json(createdUser);
            }
            case 'delete': {
                const { userIdToDelete, currentUserId } = payload;
                if (!userIdToDelete || !currentUserId) {
                    return res.status(400).json({ message: 'userIdToDelete and currentUserId are required.' });
                }

                // 1. Verify Admin Privileges
                const currentUserDoc = await db.collection('users').doc(currentUserId).get();
                if (!currentUserDoc.exists || currentUserDoc.data()?.role !== 'Admin') {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete users.' });
                }

                // 2. Get user data for logging before deletion
                const userToDeleteDoc = await db.collection('users').doc(userIdToDelete).get();
                const userToDeleteData = userToDeleteDoc.data();
                const userToDeleteName = userToDeleteData?.name || `user with ID ${userIdToDelete}`;

                // 3. Delete from Firebase Auth and Firestore
                await auth.deleteUser(userIdToDelete);
                await db.collection('users').doc(userIdToDelete).delete();

                // 4. Log the activity
                await db.collection('activity_logs').add({
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    userId: currentUserId,
                    userName: currentUserDoc.data()?.name || 'Unknown Admin',
                    action: 'Menghapus Pengguna (Akun & Data)',
                    details: `Pengguna ${userToDeleteName} telah dihapus permanen dari sistem.`
                });

                return res.status(200).json({ success: true, message: `User ${userToDeleteName} has been deleted successfully.` });
            }
            default:
                return res.status(400).json({ message: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in users handler (action: ${action}):`, error);
        
        let errorMessage = 'Internal Server Error';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found in Firebase Authentication. The account may have already been deleted.';
            try {
                const { userIdToDelete } = payload;
                if (userIdToDelete) {
                     await admin.firestore().collection('users').doc(userIdToDelete).delete();
                     return res.status(200).json({ success: true, message: 'User data cleaned up from Firestore.' });
                }
            } catch (cleanupError) {
                 return res.status(500).json({ message: 'User not found in Auth, and also failed to clean up Firestore.', error: (cleanupError as Error).message });
            }
        }
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'Email ini sudah digunakan oleh akun lain.';
        }
        
        return res.status(500).json({
            message: errorMessage,
            error: error.message || String(error),
        });
    }
}
