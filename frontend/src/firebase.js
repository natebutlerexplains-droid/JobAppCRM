import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCKAK7K-3mw5CTsC5TjY6XjGXZRsb4SKTM",
  authDomain: "pipeline-job-crm.firebaseapp.com",
  projectId: "pipeline-job-crm",
  storageBucket: "pipeline-job-crm.firebasestorage.app",
  messagingSenderId: "687098450957",
  appId: "1:687098450957:web:d733f1f2286c19f522b144"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
