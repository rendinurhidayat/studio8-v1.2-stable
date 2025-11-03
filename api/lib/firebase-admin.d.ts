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
export declare function initFirebaseAdmin(): admin.app.App;
