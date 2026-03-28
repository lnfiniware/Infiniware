import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js'
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
import { getStorage } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js'

const firebaseConfig = {
  apiKey: 'AIzaSyB6PPd_kNJkvkSQ9Ilfa9Q6nQ2rGo83zXU',
  authDomain: 'infiniware-b3b54.firebaseapp.com',
  projectId: 'infiniware-b3b54',
  storageBucket: 'infiniware-b3b54.firebasestorage.app',
  messagingSenderId: '815856884778',
  appId: '1:815856884778:web:7ddaab50243fc2b2d1b753',
  measurementId: 'G-8QEQ03JFKK'
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

const googleProvider = new GoogleAuthProvider()
const githubProvider = new GithubAuthProvider()
githubProvider.addScope('public_repo')

export { auth, db, storage, googleProvider, githubProvider }
