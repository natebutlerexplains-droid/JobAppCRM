import { db } from './firebase'
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  setDoc,
} from 'firebase/firestore'

// Applications
export const createApplication = async (userId, data) => {
  const docRef = await addDoc(collection(db, `users/${userId}/applications`), {
    ...data,
    order_position: data.order_position ?? 0,
    created_at: new Date(),
    updated_at: new Date(),
  })
  return { id: docRef.id, ...data, order_position: data.order_position ?? 0 }
}

export const getApplications = async (userId) => {
  const snapshot = await getDocs(collection(db, `users/${userId}/applications`))
  const docs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
  // Sort by date_submitted descending, then by creation order
  return docs.sort((a, b) => {
    const aDate = a.date_submitted ? new Date(a.date_submitted) : new Date(0)
    const bDate = b.date_submitted ? new Date(b.date_submitted) : new Date(0)
    return bDate - aDate
  })
}

export const updateApplication = async (userId, appId, data) => {
  const ref = doc(db, `users/${userId}/applications/${appId}`)
  await updateDoc(ref, {
    ...data,
    updated_at: new Date(),
  })
}

export const deleteApplication = async (userId, appId) => {
  await deleteDoc(doc(db, `users/${userId}/applications/${appId}`))
}

export const reorderApplications = async (userId, updates) => {
  const batch = writeBatch(db)
  updates.forEach(({ id, order_position }) => {
    const ref = doc(db, `users/${userId}/applications/${id}`)
    batch.update(ref, { order_position })
  })
  await batch.commit()
}

// Interview Prep
export const getInterviewPrep = async (userId, appId) => {
  try {
    const ref = doc(db, `users/${userId}/interviewPrep/${appId}`)
    const snapshot = await getDoc(ref)
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() }
    }
    return null
  } catch (err) {
    return null
  }
}

export const saveInterviewPrep = async (userId, appId, data) => {
  const ref = doc(db, `users/${userId}/interviewPrep/${appId}`)
  await setDoc(ref, {
    ...data,
    updated_at: new Date(),
  }, { merge: true })
}

export const deleteInterviewPrep = async (userId, appId) => {
  const ref = doc(db, `users/${userId}/interviewPrep/${appId}`)
  await deleteDoc(ref)
}

export const getInterviewPrepHistory = async (userId) => {
  const q = query(
    collection(db, `users/${userId}/interviewPrep`),
    orderBy('updated_at', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    application_id: doc.id,
    ...doc.data(),
  }))
}
