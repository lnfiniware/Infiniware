/**
 * Infiniware Community Forum System
 * Handles categories, topics, posts, and replies
 */

import { db, auth, storage } from './firebase-init.js'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js'

// Collection names
const COLLECTION_CATEGORIES = 'categories'
const COLLECTION_TOPICS = 'topics'
const COLLECTION_POSTS = 'posts'
const COLLECTION_USERS = 'users'

/**
 * Initialize default categories if they don't exist
 * This should be run once by an admin, but we'll provide the structure
 */
export async function initializeCategories() {
  const categoriesRef = collection(db, COLLECTION_CATEGORIES)
  const snapshot = await getDocs(categoriesRef)

  if (snapshot.empty) {
    const defaultCategories = [
      {
        title: 'general',
        description: 'general discussions and announcements'
      },
      {
        title: 'development',
        description: 'coding, tools, and technical discussions'
      },
      { title: 'showcase', description: 'share your projects and work' },
      { title: 'help', description: 'ask questions and get support' },
      { title: 'feedback', description: 'suggestions and platform feedback' }
    ]

    // Note: This requires admin privileges, so we'll just return the structure
    // Admin should create these manually or via admin panel
    return defaultCategories
  }

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/**
 * Get all categories
 */
export async function getCategories() {
  const categoriesRef = collection(db, COLLECTION_CATEGORIES)
  const q = query(categoriesRef, orderBy('created_at', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/**
 * Listen to categories in real-time
 */
export function subscribeToCategories(callback) {
  const categoriesRef = collection(db, COLLECTION_CATEGORIES)
  const q = query(categoriesRef, orderBy('created_at', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(categories)
  })
}

/**
 * Get topics for a category
 */
export async function getTopicsByCategory(categoryId, limitCount = 50) {
  const topicsRef = collection(db, COLLECTION_TOPICS)
  const q = query(
    topicsRef,
    where('category_id', '==', categoryId),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/**
 * Get all topics (latest first)
 */
export async function getAllTopics(limitCount = 50) {
  const topicsRef = collection(db, COLLECTION_TOPICS)
  const q = query(topicsRef, orderBy('created_at', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/**
 * Subscribe to topics in real-time
 */
export function subscribeToTopics(categoryId, callback) {
  const topicsRef = collection(db, COLLECTION_TOPICS)
  let q

  if (categoryId && categoryId !== 'uncategorized') {
    q = query(topicsRef, where('category_id', '==', categoryId), orderBy('created_at', 'desc'))
  } else if (categoryId === 'uncategorized') {
    // Show topics with 'uncategorized' category_id
    q = query(topicsRef, where('category_id', '==', 'uncategorized'), orderBy('created_at', 'desc'))
  } else {
    // Show all topics (no filter)
    q = query(topicsRef, orderBy('created_at', 'desc'))
  }

  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate()
    }))
    callback(topics)
  })
}

/**
 * Get a single topic by ID
 */
export async function getTopic(topicId) {
  const topicRef = doc(db, COLLECTION_TOPICS, topicId)
  const snapshot = await getDoc(topicRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

/**
 * Create a new topic
 */
export async function createTopic(categoryId, title, initialPostContent, mediaFiles = []) {
  const user = auth.currentUser
  if (!user) throw new Error('User must be authenticated')

  // Get user profile for username
  const userDoc = await getDoc(doc(db, COLLECTION_USERS, user.uid))
  const userData = userDoc.exists() ? userDoc.data() : {}
  const username = userData.username || user.displayName || user.email.split('@')[0]

  // Upload media files if any
  const mediaUrls = []
  for (const file of mediaFiles) {
    if (file && file.size > 0) {
      const storageRef = ref(storage, `media/${user.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      mediaUrls.push(url)
    }
  }

  // Create topic
  const topicRef = await addDoc(collection(db, COLLECTION_TOPICS), {
    category_id: categoryId,
    title: title.trim(),
    author_uid: user.uid,
    author_username: username,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    pinned: false,
    locked: false
  })

  // Create initial post
  await addDoc(collection(db, COLLECTION_POSTS), {
    topic_id: topicRef.id,
    parent_post_id: null,
    author_uid: user.uid,
    author_username: username,
    content: initialPostContent.trim(),
    media_urls: mediaUrls,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })

  return topicRef.id
}

/**
 * Get posts for a topic
 */
export async function getPostsByTopic(topicId) {
  const postsRef = collection(db, COLLECTION_POSTS)
  const q = query(postsRef, where('topic_id', '==', topicId), orderBy('created_at', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    created_at: doc.data().created_at?.toDate(),
    updated_at: doc.data().updated_at?.toDate()
  }))
}

/**
 * Subscribe to latest posts (across all topics)
 */
export function subscribeToLatestPosts(limitCount = 20, callback) {
  const postsRef = collection(db, COLLECTION_POSTS)
  const q = query(postsRef, orderBy('created_at', 'desc'), limit(limitCount))

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate()
    }))
    callback(posts)
  })
}

/**
 * Subscribe to posts for a topic in real-time
 */
export function subscribeToPosts(topicId, callback) {
  const postsRef = collection(db, COLLECTION_POSTS)
  const q = query(postsRef, where('topic_id', '==', topicId), orderBy('created_at', 'asc'))

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate()
    }))
    callback(posts)
  })
}

/**
 * Create a post (reply) in a topic
 */
export async function createPost(topicId, content, parentPostId = null, mediaFiles = []) {
  const user = auth.currentUser
  if (!user) throw new Error('User must be authenticated')

  // Get user profile for username
  const userDoc = await getDoc(doc(db, COLLECTION_USERS, user.uid))
  const userData = userDoc.exists() ? userDoc.data() : {}
  const username = userData.username || user.displayName || user.email.split('@')[0]

  // Upload media files if any
  const mediaUrls = []
  for (const file of mediaFiles) {
    if (file && file.size > 0) {
      const storageRef = ref(storage, `media/${user.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      mediaUrls.push(url)
    }
  }

  // Create post
  const postRef = await addDoc(collection(db, COLLECTION_POSTS), {
    topic_id: topicId,
    parent_post_id: parentPostId,
    author_uid: user.uid,
    author_username: username,
    content: content.trim(),
    media_urls: mediaUrls,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  })

  // Update topic's updated_at timestamp
  const topicRef = doc(db, COLLECTION_TOPICS, topicId)
  await updateDoc(topicRef, {
    updated_at: serverTimestamp()
  })

  return postRef.id
}

/**
 * Update a post
 */
export async function updatePost(postId, newContent) {
  const user = auth.currentUser
  if (!user) throw new Error('User must be authenticated')

  const postRef = doc(db, COLLECTION_POSTS, postId)
  const postDoc = await getDoc(postRef)

  if (!postDoc.exists()) throw new Error('Post not found')
  if (postDoc.data().author_uid !== user.uid) throw new Error('Not authorized')

  await updateDoc(postRef, {
    content: newContent.trim(),
    updated_at: serverTimestamp()
  })
}

/**
 * Delete a post
 */
export async function deletePost(postId) {
  const user = auth.currentUser
  if (!user) throw new Error('User must be authenticated')

  const postRef = doc(db, COLLECTION_POSTS, postId)
  const postDoc = await getDoc(postRef)

  if (!postDoc.exists()) throw new Error('Post not found')
  if (postDoc.data().author_uid !== user.uid) throw new Error('Not authorized')

  await deleteDoc(postRef)
}

/**
 * Get user profile
 */
export async function getUserProfile(uid) {
  const userRef = doc(db, COLLECTION_USERS, uid)
  const snapshot = await getDoc(userRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

/**
 * Get posts by a user
 */
export async function getPostsByUser(uid, limitCount = 20) {
  const postsRef = collection(db, COLLECTION_POSTS)
  const q = query(
    postsRef,
    where('author_uid', '==', uid),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    created_at: doc.data().created_at?.toDate(),
    updated_at: doc.data().updated_at?.toDate()
  }))
}

/**
 * Get topics by a user
 */
export async function getTopicsByUser(uid, limitCount = 20) {
  const topicsRef = collection(db, COLLECTION_TOPICS)
  const q = query(
    topicsRef,
    where('author_uid', '==', uid),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    created_at: doc.data().created_at?.toDate(),
    updated_at: doc.data().updated_at?.toDate()
  }))
}

/**
 * Format date for display
 */
export function formatDate(date) {
  if (!date) return 'unknown'
  if (date.toDate) date = date.toDate()
  if (!(date instanceof Date)) date = new Date(date)

  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

/**
 * Get reply count for a topic (count posts excluding the first one)
 */
export async function getTopicReplyCount(topicId) {
  const postsRef = collection(db, COLLECTION_POSTS)
  const q = query(postsRef, where('topic_id', '==', topicId))
  const snapshot = await getDocs(q)
  // Subtract 1 because the first post is the topic starter, not a reply
  return Math.max(0, snapshot.size - 1)
}
