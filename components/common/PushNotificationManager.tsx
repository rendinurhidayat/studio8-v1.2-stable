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

    const VAPID_PUBLIC_KEY = window.appConfig?.vapidPublicKey;

    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'default') {
            setShowPermissionBanner(true);
        }
        
        navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(subscription => {
                if (subscription) {
                    setIsSubscribed(true);
                }
            });
        });

    }, []);

    const subscribeUser = async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID public key is not defined in window.appConfig.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            
            // Send subscription to backend
            if (user) {
                await fetch('/api/subscriptions', {
                    method: 'POST',
                    body: JSON.stringify({ subscription, userId: user.id, role: user.role }),
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            setIsSubscribed(true);
            setShowPermissionBanner(false);
        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        }
    };
    
    const handleRequestPermission = () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                subscribeUser();
            } else {
                // User denied permission, hide the banner
                setShowPermissionBanner(false);
            }
        });
    };
    
    // We only want to show the banner to logged-in Admins and Staff
    if (!user || (user.role !== 'Admin' && user.role !== 'Staff') || !showPermissionBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white shadow-lg rounded-lg p-4 flex items-center gap-4 max-w-sm">
            <div className="p-2 bg-blue-100 rounded-full">
                <Bell className="text-blue-600" />
            </div>
            <div>
                <p className="font-semibold">Aktifkan notifikasi</p>
                <p className="text-sm text-gray-600">Dapatkan pemberitahuan untuk booking baru & aktivitas penting.</p>
            </div>
            <div className="flex flex-col gap-2">
                 <button onClick={handleRequestPermission} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Aktifkan</button>
                 <button onClick={() => setShowPermissionBanner(false)} className="px-3 py-1 text-sm text-gray-500">Nanti Saja</button>
            </div>
        </div>
    );
};

export default PushNotificationManager;