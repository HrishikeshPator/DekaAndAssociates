importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyAAhyUKq3FjiUYJnYxXKWwnYLcoNGO1zaY",
  authDomain: "dekaandassociatesghy.firebaseapp.com",
  projectId: "dekaandassociatesghy",
  storageBucket: "dekaandassociatesghy.firebasestorage.app",
  messagingSenderId: "939359139918",
  appId: "1:939359139918:web:e23e316fa07ec44d2e6b1f",
  measurementId: "G-PD9SYHMDKK"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.webp',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
