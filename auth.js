import { auth, db, googleProvider, githubProvider } from './firebase-init.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  reload,
  GithubAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'

const COLLECTION_USERS = 'users'

// Authentication

/**
 * Build ActionCodeSettings for email verification.
 * Firebase only sends the email if url uses an Authorized domain (Firebase Console > Authentication > Authorized domains).
 * For local dev add 127.0.0.1 (and localhost if needed).
 */
function getEmailVerificationActionCodeSettings() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    url: `${origin}/verify-email.html`,
    handleCodeInApp: false
  }
}

/**
 * Send verification email. Must be called with actionCodeSettings (valid authorized URL)
 * or Firebase may not deliver the email.
 */
export async function sendVerificationEmailNow(user) {
  const actionCodeSettings = getEmailVerificationActionCodeSettings()
  await sendEmailVerification(user, actionCodeSettings)
}

/**
 * Sign up a new user with email/password and username.
 * Creates Auth user -> Sends verification -> Creates Firestore doc.
 */
export async function signUp(email, password, username) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // 1. Update Auth Profile
    await updateProfile(user, {
      displayName: username
    })

    // 2. Create Firestore Document
    await createUserDocument(user, username)

    // 3. Send Verification Email (actionCodeSettings required for delivery)
    await sendVerificationEmailNow(user)

    return user
  } catch (error) {
    console.error('SignUp Error:', error)
    throw error
  }
}

/**
 * Sign in with email and password.
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error('SignIn Error:', error)
    throw error
  }
}

/**
 * Sign in with GitHub.
 * Handles user creation if it's the first time.
 */
export async function signInWithGithub() {
  try {
    const result = await signInWithPopup(auth, githubProvider)
    const user = result.user

    // Check if user doc exists, if not create it
    const userDocRef = doc(db, COLLECTION_USERS, user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      await createUserDocument(user, user.displayName || user.email.split('@')[0])
    }

    // Store access token for GitHub API calls
    const credential = GithubAuthProvider.credentialFromResult(result)
    if (credential && credential.accessToken) {
      sessionStorage.setItem('gh_token', credential.accessToken)
    }

    // Return result to access credential.accessToken
    return result
  } catch (error) {
    console.error('GitHub SignIn Error:', error)
    throw error
  }
}

// Firestore helpers
async function createUserDocument(user, username) {
  const userRef = doc(db, COLLECTION_USERS, user.uid)
  await setDoc(userRef, {
    uid: user.uid,
    username: username.toLowerCase().trim(), // Enforce lowercase and trim
    email: user.email,
    avatar_url: user.photoURL || null,
    bio: '',
    website: '',
    location: '',
    social_links: {},
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })
}

/**
 * Log out the current user.
 */
export async function logout() {
  try {
    await signOut(auth)
    window.location.href = 'index.html'
  } catch (error) {
    console.error('Logout Error:', error)
    throw error
  }
}

/**
 * Send password reset email.
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/signin.html`,
      handleCodeInApp: false
    })
  } catch (error) {
    console.error('Password Reset Error:', error)
    throw error
  }
}

/**
 * Resend email verification (uses actionCodeSettings for delivery).
 */
export async function resendVerificationEmail() {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('No user signed in')
    await sendVerificationEmailNow(user)
  } catch (error) {
    console.error('Resend Verification Error:', error)
    throw error
  }
}

/**
 * Check if user email is verified.
 */
export async function checkEmailVerification() {
  try {
    const user = auth.currentUser
    if (!user) return false
    await reload(user)
    return user.emailVerified
  } catch (error) {
    console.error('Check Verification Error:', error)
    return false
  }
}

/**
 * Listen for auth state changes.
 * Use this to protect pages or update UI.
 */
export function initAuthListener(callback) {
  onAuthStateChanged(auth, (user) => {
    if (callback) callback(user)
  })
}
