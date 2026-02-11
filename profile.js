import { db } from './firebase-init.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'

const loading = document.getElementById('loading')
const content = document.getElementById('profile-content')
const errorMsg = document.getElementById('error-msg')

const pAvatar = document.getElementById('p-avatar')
const pUsername = document.getElementById('p-username')
const pBio = document.getElementById('p-bio')
const pLocation = document.getElementById('p-location')
const pWebsite = document.getElementById('p-website')

// load and render profile
async function loadProfile() {
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('uid')

  if (!uid) {
    showError()
    return
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid))

    if (!userDoc.exists()) {
      showError()
      return
    }

    const data = userDoc.data()
    renderProfile(data)
  } catch (err) {
    console.error('Profile load error:', err)
    showError()
  }
}

function renderProfile(data) {
  loading.style.display = 'none'
  content.style.display = 'block'

  const username = data.username || 'User'
  document.title = `${username} - Infiniware`
  pUsername.textContent = username

  if (data.avatar_url) {
    pAvatar.innerHTML = `<img src="${data.avatar_url}" alt="${username}">`
  } else {
    pAvatar.textContent = username[0].toUpperCase()
  }

  if (data.bio) {
    pBio.textContent = data.bio
    pBio.style.color = 'var(--clr-gray-dim)'
  } else {
    pBio.style.display = 'none'
  }

  if (data.location) {
    pLocation.textContent = data.location
  } else {
    pLocation.style.display = 'none'
  }

  if (data.website) {
    pWebsite.href = data.website.startsWith('http') ? data.website : `https://${data.website}`
    pWebsite.style.display = 'inline-block'
  }
}

function showError() {
  loading.style.display = 'none'
  content.style.display = 'none'
  errorMsg.style.display = 'block'
}

loadProfile()
