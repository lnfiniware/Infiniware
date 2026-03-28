/**
 * Initialize Categories in Firestore
 * Run this once to create default categories: linux, programming, tech
 * Also adds "no category" option (empty string category_id)
 */

import { db } from './firebase-init.js'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'

const defaultCategories = [
  {
    id: 'uncategorized',
    title: 'no category',
    description: "topics that don't belong to a specific category"
  },
  {
    id: 'linux',
    title: 'linux',
    description: 'linux discussions, distributions, and system administration'
  },
  {
    id: 'programming',
    title: 'programming',
    description: 'coding, languages, frameworks, and development tools'
  },
  {
    id: 'tech',
    title: 'tech',
    description: 'technology news, hardware, software, and general tech discussions'
  }
]

export async function initializeCategories() {
  console.log('Ensuring default categories exist...')

  for (const cat of defaultCategories) {
    try {
      const ref = doc(db, 'categories', cat.id)
      const existing = await getDoc(ref)
      if (existing.exists()) continue

      await setDoc(ref, {
        title: cat.title,
        description: cat.description,
        created_at: serverTimestamp()
      })

      console.log(`Created category: ${cat.id}`)
    } catch (error) {
      console.error(`Error creating category ${cat.id}:`, error)
    }
  }

  console.log('Category initialization complete.')
}

// Auto-run if imported directly (for admin use)
if (typeof window !== 'undefined' && window.location.pathname.includes('dashboard')) {
  // Only run if user is admin (you can add admin check here)
  // initializeCategories();
}
