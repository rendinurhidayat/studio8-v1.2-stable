// A simple, visually distinct debugging utility for Google AI Studio and other browser environments.

const STYLES = {
    header: 'background: #0a1a2f; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
    log: 'color: #3b82f6;', // Blue
    warn: 'color: #f59e0b;', // Amber
    error: 'color: #dc2626;', // Red
    success: 'color: #16a34a;', // Green
};

class Debugger {
    private static instance: Debugger;

    private constructor() {
        this.initGlobalHandlers();
        this.log('Debugger initialized and attached to global error handlers. 🕵️‍♂️');
    }

    public static getInstance(): Debugger {
        if (!Debugger.instance) {
            Debugger.instance = new Debugger();
        }
        return Debugger.instance;
    }
    
    // Private method to handle the actual console logging safely.
    private print(level: 'log' | 'warn' | 'error' | 'info' | 'debug', emoji: string, ...args: any[]) {
        const message = [`%cStudio8`, STYLES.header, emoji, ...args];
        
        // This switch block prevents "console[level] is not a function" errors
        // by calling the methods directly.
        switch (level) {
            case 'log':
                console.log(...message);
                break;
            case 'warn':
                console.warn(...message);
                break;
            case 'error':
                console.error(...message);
                break;
            case 'info':
                console.info(...message);
                break;
            case 'debug':
                console.debug(...message);
                break;
            default:
                console.log(...message);
        }
    }

    // Public API for logging
    public log = (...args: any[]) => this.print('log', '🔵', ...args);
    public warn = (...args: any[]) => this.print('warn', '🟠', ...args);
    public error = (...args: any[]) => this.print('error', '🔴', ...args);
    public success = (...args: any[]) => this.print('log', '✅', ...args);

    /**
     * Attaches handlers to global `onerror` and `onunhandledrejection` events.
     */
    private initGlobalHandlers() {
        // Handle synchronous runtime errors
        window.onerror = (message, source, lineno, colno, error) => {
            const errorMessage = typeof message === 'string' ? message : (message as Event).type;
            this.error(
                'Uncaught Global Error:',
                errorMessage,
                `\n  at ${source?.split('/').pop()}:${lineno}:${colno}`,
                error
            );
            // Return false to let the default handler run (which is good practice)
            return false;
        };

        // Handle unhandled promise rejections
        window.onunhandledrejection = (event: PromiseRejectionEvent) => {
            this.error('Unhandled Promise Rejection:', event.reason);
        };
    }

    /**
     * Inspects the Firebase instance and logs the status of its core components.
     * @param firebaseInstance The `firebase` object from `firebase/compat/app`.
     */
    public checkFirebase(firebaseInstance: any) {
        this.log('--- Firebase Status Check ---');

        if (!firebaseInstance) {
            this.error('Firebase object is NULL or UNDEFINED. Import is likely broken.');
            return;
        }

        if (firebaseInstance.apps?.length > 0) {
            this.success('Firebase App Initialized.', `Project: ${firebaseInstance.apps[0].options.projectId}`);
        } else {
            this.error('Firebase App NOT Initialized. Check `firebase.initializeApp()`.');
        }

        // Check for component registration, which is the cause of "is not a function" errors.
        const services = ['auth', 'firestore', 'storage'];
        services.forEach(service => {
            if (typeof firebaseInstance[service] === 'function') {
                this.success(`Firebase ${service} component is registered.`);
            } else {
                this.error(`Firebase ${service} component NOT registered. Did you forget to import 'firebase/compat/${service}'?`);
            }
        });
        
        this.log('--- End Firebase Check ---');
    }
}

// Instantiate and export the singleton instance.
// The constructor automatically sets up the global handlers.
const DebugTools = Debugger.getInstance();

export default DebugTools;