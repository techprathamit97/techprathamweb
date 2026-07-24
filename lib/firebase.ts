// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBk_2J7aZhK_03oPWj4gDWdxmVBNY9zFBA",
  authDomain: "techpratham-lms.firebaseapp.com",
  projectId: "techpratham-lms",
  storageBucket: "techpratham-lms.firebasestorage.app",
  messagingSenderId: "972812696190",
  appId: "1:972812696190:web:8af883c03f8a5635c4362f",
  measurementId: "G-P360QQJSC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.warn('Firebase messaging not available (probably SSR)');
      return null;
    }
    
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted.');
      
      try {
        // Try to get FCM token without VAPID key first (for testing)
        console.log('🎯 Attempting to get FCM token...');
        const token = await getToken(messaging);
        
        if (token) {
          console.log('🎉 FCM Token obtained:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.log('⚠️ No FCM token available - might need VAPID key configuration');
          return null;
        }
      } catch (tokenError: any) {
        console.error('❌ Error getting FCM token:', tokenError);
        
        // Check if it's an authentication/VAPID key error
        if (tokenError.message?.includes('authentication credential') || 
            tokenError.message?.includes('VAPID')) {
          console.warn('🔧 VAPID key might be missing or invalid. FCM token generation failed.');
          console.warn('📝 To fix: Generate a VAPID key in Firebase Console > Project Settings > Cloud Messaging > Web configuration');
          return null;
        }
        
        throw tokenError;
      }
    } else {
      console.log('❌ Notification permission denied.');
      return null;
    }
  } catch (error: any) {
    console.error('💥 Error requesting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);
        resolve(payload);
      });
    }
  });
};

export { app, analytics, messaging };