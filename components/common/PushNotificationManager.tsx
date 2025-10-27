import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, X } from 'lucide-react';

// This function is needed to convert the VAPID public key string to a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushNotificationManager: React.FC = () => {
    const { user } = useAuth();
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    
    useEffect(() => {
        if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        const checkSubscription = async () => {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                setIsSubscribed(true);
            } else {
                // FIX: Notification.permission can be 'default', 'granted', or 'denied'. The 'prompt' state is represented by 'default'.
                if (Notification.permission === 'default') {
                    setShowPermissionBanner(true);
                }
            }
        };
        
        // Service worker is now registered in App.tsx, we just wait for it to be ready
        checkSubscription().catch(error => {
            console.error('Error checking push subscription status:', error);
        });

    }, [user]);

    const subscribeUser = async () => {
        if (!user) return;
        
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Permission for notifications was denied.');
                setShowPermissionBanner(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            // FIX: Cast `import.meta` to `unknown` first to handle TypeScript error where `env` is not a known property on `ImportMeta`. This is a common workaround for Vite env variables.
            const vapidPublicKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                console.error("VITE_VAPID_PUBLIC_KEY is not set in environment variables.");
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            // Send subscription to the server
            await fetch('/api/saveSubscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription, userId: user.id, role: user.role }),
            });

            setIsSubscribed(true);
            setShowPermissionBanner(false);
            console.log('User is subscribed.');

        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        }
    };

    if (!showPermissionBanner || isSubscribed) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-primary text-primary-content rounded-xl shadow-2xl z-50 animate-fade-in-up">
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <Bell size={20} />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-semibold">Aktifkan Notifikasi</p>
                    <p className="mt-1 text-sm">Dapatkan pemberitahuan instan saat ada booking baru masuk.</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                     <button
                        onClick={subscribeUser}
                        className="text-sm font-bold bg-accent text-accent-content px-3 py-1.5 rounded-lg hover:bg-accent/90"
                    >
                        Aktifkan
                    </button>
                    <button
                        onClick={() => setShowPermissionBanner(false)}
                        className="ml-2 p-1.5 rounded-full hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PushNotificationManager;