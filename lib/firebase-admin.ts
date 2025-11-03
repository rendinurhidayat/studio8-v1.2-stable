
import admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK, implementing a singleton pattern to ensure
 * it's only initialized once per serverless function instance.
 * 
 * This centralized initializer provides robust error handling for common issues
 * with environment variables in Vercel/serverless environments, such as malformed JSON.
 * 
 * @returns {admin.app.App} The initialized Firebase Admin app instance.
 * @throws {Error} If the FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing or invalid.
 */
export function initFirebaseAdmin(): admin.app.App {
    // Return existing app if already initialized
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Check for the existence of the service account environment variable
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Server configuration error: The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    }

    let serviceAccount;
    try {
        // Parse the service account key from the environment variable.
        // This is a common point of failure if the JSON is not correctly formatted as a single-line string.
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("Server configuration error: Could not parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid, single-line JSON string with no line breaks.");
    }

    // Initialize the app with the parsed credentials.
    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    } catch (error: any) {
        console.error("Firebase Admin initialization failed:", error);
        throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
}
