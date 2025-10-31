// A simple, visually distinct debugging utility for Google AI Studio.

const STYLES = {
    log: 'color: #00AEEF; font-weight: bold;',
    warn: 'color: #D9A441; font-weight: bold;',
    error: 'color: #dc2626; font-weight: bold;',
    trace: 'color: #6b7280;',
    success: 'color: #16a34a; font-weight: bold;',
    header: 'background: #0a1a2f; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
};

class DebugToolsSingleton {
    private static instance: DebugToolsSingleton;
    private isEnabled: boolean = true; // Can be controlled by a global flag or build env in a real app

    private constructor() {}

    public static getInstance(): DebugToolsSingleton {
        if (!DebugToolsSingleton.instance) {
            DebugToolsSingleton.instance = new DebugToolsSingleton();
        }
        return DebugToolsSingleton.instance;
    }

    private print(level: 'log' | 'warn' | 'error' | 'trace' | 'success', emoji: string, ...args: any[]) {
        if (!this.isEnabled) return;
        console[level](`%cStudio8`, STYLES.header, `${emoji} `, ...args);
    }

    log(...args: any[]) {
        this.print('log', '🔵', ...args);
    }

    warn(...args: any[]) {
        this.print('warn', '🟠', ...args);
    }

    error(...args: any[]) {
        this.print('error', '🔴', ...args);
    }

    trace(...args: any[]) {
        this.print('trace', '⚪️', ...args);
    }
    
    success(...args: any[]) {
        this.print('success', '✅', ...args);
    }

    /**
     * Checks the status of the Firebase instance and its main components.
     * @param firebaseInstance The imported firebase object.
     */
    checkFirebase(firebaseInstance: any) {
        this.log('--- Firebase Environment Check ---');
        
        if (!firebaseInstance) {
            this.error('Firebase object is not available at all.');
            return;
        }
        
        // Check for initialization
        if (firebaseInstance.apps.length > 0) {
            this.success('Firebase App is initialized.');
            this.trace(`Project ID: ${firebaseInstance.apps[0].options.projectId}`);
        } else {
            this.error('Firebase App is NOT initialized. `firebase.initializeApp()` was likely not called or failed.');
        }

        // Check for core services (the root of many "is not a function" errors)
        if (typeof firebaseInstance.auth === 'function') {
            this.success('`firebase.auth` component is registered.');
        } else {
            this.error('`firebase.auth` is NOT registered. Did you forget to import `firebase/compat/auth`?');
        }

        if (typeof firebaseInstance.firestore === 'function') {
            this.success('`firebase.firestore` component is registered.');
        } else {
            this.error('`firebase.firestore` is NOT registered. Did you forget to import `firebase/compat/firestore`?');
        }
        
        if (typeof firebaseInstance.storage === 'function') {
            this.success('`firebase.storage` component is registered.');
        } else {
            this.warn('`firebase.storage` is NOT registered. Import `firebase/compat/storage` if you need it.');
        }

        this.log('--- End Firebase Check ---');
    }

    /**
     * Runs a quick inspection of the browser environment.
     */
    inspectEnvironment() {
        console.group('%cStudio8 Debug System', STYLES.header);
        this.log('Debug system activated.');
        this.trace(`Hostname: ${window.location.hostname}`);
        if (window.firebaseConfig) {
            this.success('Global `firebaseConfig` found on window object.');
        } else {
            this.warn('Global `firebaseConfig` not found. App will rely on local fallback.');
        }
        console.groupEnd();
    }
}

// Instantiate and export the singleton
const DebugTools = DebugToolsSingleton.getInstance();

// Automatically run the environment inspection when this module is imported.
DebugTools.inspectEnvironment();

export default DebugTools;