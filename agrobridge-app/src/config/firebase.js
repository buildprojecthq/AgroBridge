import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// When using @react-native-firebase, the initialization happens automatically
// under the hood on iOS and Android via the google-services.json and GoogleService-Info.plist files.

// Export the native modular instances
const auth = getAuth();
const db = getFirestore();
export { auth, db };
