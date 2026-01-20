// Firebase Configuration
// TODO: Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAD1lYgWyNHGer-rPjJegixTJearoPS5io",
  authDomain: "lol-spell-cd.firebaseapp.com",
  databaseURL: "https://lol-spell-cd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lol-spell-cd",
  storageBucket: "lol-spell-cd.firebasestorage.app",
  messagingSenderId: "496008473231",
  appId: "1:496008473231:web:a07c259414242965549efa"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Hardcoded session ID for shared tracking
const SESSION_ID = "lol-spell-tracker-session-1";
const sessionRef = database.ref(`sessions/${SESSION_ID}`);

export { database, sessionRef, SESSION_ID };
