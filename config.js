// Bungalow Supplies — sync configuration.
// Leave apiKey empty to run in LOCAL MODE (list lives on this phone only).
// To turn on live sync between both phones, paste the values from
// Firebase console > Project settings > Your apps > Web app > "SDK setup and configuration" > Config.
// These values are NOT secret (Firebase web config is public by design); access is controlled by firestore.rules
// and the household code, which is never stored here.
window.BS_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
