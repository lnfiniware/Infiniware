import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyB6PPd_kNJkvkSQ9Ilfa9Q6nQ2rGo83zXU',
  authDomain: 'infiniware-b3b54.firebaseapp.com',
  projectId: 'infiniware-b3b54',
  storageBucket: 'infiniware-b3b54.firebasestorage.app',
  messagingSenderId: '815856884778',
  appId: '1:815856884778:web:7ddaab50243fc2b2d1b753',
  measurementId: 'G-8QEQ03JFKK'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const analytics = getAnalytics(app)

document.addEventListener('DOMContentLoaded', () => {
  initNavigation()
  initScrollReveals()
  initCopyright()
  initFooterSocials()
  initEventCountdown()
  initPrayerTimes()
  initMobileMenu()
  initTheme()

  // Logic Dispatcher
  const path = window.location.pathname
  if (path.includes('dashboard.html')) {
    initDashboard()
  }
})

// --- Logic Shared across Auth Views ---

onAuthStateChanged(auth, async (user) => {
  const isDashboard = window.location.pathname.includes('dashboard.html')

  const dashboardLink = document.getElementById('nav-dashboard')

  if (user) {
    if (dashboardLink) dashboardLink.style.display = 'block'
    if (!user.emailVerified) {
      handleUnverified(user, isDashboard)
    } else {
      // Verified User
      if (isDashboard) {
        checkBanStatus(user.uid)
        listenForPosts()
        updateUserUI(user)
      }
    }
  } else {
    // Unauthenticated
    if (dashboardLink) dashboardLink.style.display = 'none'
  }
})

function handleUnverified(user, isDashboard) {
  console.log('// infiniware ecosystem: pending verification for', user.email)

  if (isDashboard) {
    // Optional: show a specific notice on dashboard for unverified
    const notice = document.getElementById('verification-notice')
    if (notice) notice.style.display = 'block'
  }

  // Polling for verification status
  const pollInterval = setInterval(async () => {
    await user.reload()
    if (auth.currentUser.emailVerified) {
      clearInterval(pollInterval)
      console.log('// infiniware ecosystem: verification confirmed')
      window.location.href = 'dashboard.html'
    }
  }, 3000)
}

// --- Navigation & Core UI ---

function initNavigation() {
  const links = document.querySelectorAll('.nav-link')
  const currentPath = window.location.pathname.split('/').pop() || 'index.html'

  links.forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active')
    }
  })

  console.log(`// infiniware system: navigation structural check passed`)
}

function initScrollReveals() {
  const revealTargets = document.querySelectorAll(
    'main section, .card, .post-card, .post-entry, article, footer.footer'
  )

  if (!revealTargets.length || !('IntersectionObserver' in window)) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  revealTargets.forEach((el) => {
    if (el.classList.contains('no-reveal')) {
      return
    }

    el.classList.add('reveal-ready')
    observer.observe(el)
  })
}

function initCopyright() {
  const footerBottom = document.querySelector('.footer-bottom span')
  if (footerBottom) {
    const year = new Date().getFullYear()
    footerBottom.textContent = `infiniware \u00a9 ${year}`
  }
}

function initFooterSocials() {
  const footer = document.querySelector('.footer')
  const footerBottom = document.querySelector('.footer-bottom')

  if (!footer || !footerBottom || footer.querySelector('.footer-socials')) return

  const socials = [
    {
      label: 'github',
      href: 'https://github.com/lnfiniware',
      svg: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`
    },
    {
      label: 'codeberg',
      href: 'https://codeberg.org/Infiniware',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1A11 11 0 0 0 1 12a11 11 0 0 0 1.7 6.4L12 6l9.3 12.4A11 11 0 0 0 23 12 11 11 0 0 0 12 1Z"/><path fill="currentColor" opacity="0.45" d="M21.3 18.4 12 6l4.4 16.8a11 11 0 0 0 4.9-4.4Z" /></svg>`
    },
    {
      label: 'mastodon',
      href: 'https://mastodon.social/@Infiniware',
      svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/></svg>`
    }
  ]

  const row = document.createElement('div')
  row.className = 'footer-socials'
  row.innerHTML = socials
    .map(
      (social) => `<a class="footer-social-link" href="${social.href}" target="_blank" rel="noopener" aria-label="${social.label}">${social.svg}<span>${social.label}</span></a>`
    )
    .join('')

  footer.insertBefore(row, footerBottom)
}

function initEventCountdown() {
  const countdown = document.querySelector('[data-event-countdown]')
  if (!countdown) return

  const targetDate = new Date(2026, 4, 21)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.max(0, Math.round((targetDate - startOfToday) / msPerDay))

  countdown.textContent =
    daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
}

// --- Community Page Logic (Public Entrance) ---

function initCommunity() {
  const loginForm = document.getElementById('email-login-form')
  const signupForm = document.getElementById('email-signup-form')
  const toggleSignInBtn = document.getElementById('toggle-signin')
  const toggleSignUpBtn = document.getElementById('toggle-signup')

  if (toggleSignInBtn && toggleSignUpBtn) {
    toggleSignInBtn.addEventListener('click', () => {
      loginForm.style.display = 'flex'
      signupForm.style.display = 'none'
      toggleSignInBtn.classList.add('active')
      toggleSignUpBtn.classList.remove('active')
    })

    toggleSignUpBtn.addEventListener('click', () => {
      loginForm.style.display = 'none'
      signupForm.style.display = 'flex'
      toggleSignInBtn.classList.remove('active')
      toggleSignUpBtn.classList.add('active')
    })
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = loginForm.email.value
      const password = loginForm.password.value
      const turnstileResponse = loginForm.querySelector('[name="cf-turnstile-response"]')?.value

      if (!turnstileResponse) {
        alert('Security check required. Please complete the Turnstile challenge.')
        return
      }

      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (err) {
        alert(`auth failure: ${err.message}`)
      }
    })
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const username = signupForm.username.value
      const email = signupForm.email.value
      const password = signupForm.password.value
      const turnstileResponse = signupForm.querySelector('[name="cf-turnstile-response"]')?.value

      if (!turnstileResponse) {
        alert('Security check required. Please complete the Turnstile challenge.')
        return
      }

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const user = credential.user

        // 1. Send Verification
        await sendEmailVerification(user)

        // 2. Save Profile
        await setDoc(doc(db, 'users', user.uid), {
          username: username,
          email: email,
          isBanned: false,
          role: 'user',
          created_at: new Date()
        })

        alert(
          'Account initialized. Please check your email to verify your identity before dashboard access.'
        )
      } catch (err) {
        alert(`initialization failure: ${err.message}`)
      }
    })
  }

  listenForPosts() // Show public feed
}

// --- Dashboard Page Logic (Private Member View) ---

function initDashboard() {
  const logoutBtn = document.getElementById('btn-logout')
  const deleteBtn = document.getElementById('btn-delete-account')
  const postForm = document.getElementById('post-creation-form')

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth)
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('permanently delete account and all structural data?')) {
        const user = auth.currentUser
        if (!user) return
        try {
          await deleteDoc(doc(db, 'users', user.uid))
          await deleteUser(user)
        } catch (err) {
          alert(`deletion failed: ${err.message}. you may need to re-authenticate first.`)
        }
      }
    })
  }

  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const content = document.getElementById('post-content').value
      const user = auth.currentUser

      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists() && userDoc.data()?.isBanned) {
          throw new Error('account is banned.')
        }

        await addDoc(collection(db, 'posts'), {
          uid: user.uid,
          username: userDoc.exists() ? userDoc.data().username : user.email.split('@')[0],
          content: content,
          created_at: serverTimestamp()
        })

        document.getElementById('post-content').value = ''
      } catch (err) {
        alert(`guardian alert: ${err.message}`)
      }
    })
  }
}

function updateUserUI(user) {
  const displayUsername = document.getElementById('display-username')
  if (displayUsername) {
    getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
      displayUsername.textContent = docSnap.exists()
        ? docSnap.data().username
        : user.email.split('@')[0]
    })
  }
}

async function checkBanStatus(uid) {
  onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (snapshot.exists() && snapshot.data().isBanned) {
      alert('Account banned. Access restricted.')
      signOut(auth)
      window.location.href = 'index.html'
    }
  })
}

function listenForPosts() {
  const container = document.getElementById('posts-container')
  if (!container) return

  const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'))
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-dim">no posts yet. be the first to contribute.</p>'
      return
    }

    function escapeHtml(text) {
      if (!text) return ''
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const post = docSnap.data()
        const safeContent = escapeHtml(post.content || '')
        const safeUsername = escapeHtml(post.username || 'anonymous')
        return `
                <div class="post-card">
                    <div class="user-block">
                        <div class="user-avatar-placeholder">
                            <div class="avatar-fill"></div>
                        </div>
                        <div class="user-info">
                            <span class="user-name">${safeUsername}</span>
                            <span class="post-date">${post.created_at ? formatTime(post.created_at) : 'just now'}</span>
                        </div>
                    </div>
                    <p class="post-content">${safeContent}</p>
                </div>
            `
      })
      .join('')
  })
}

function formatTime(timestamp) {
  const date = timestamp && timestamp.toDate ? timestamp.toDate() : new Date()
  return date
    .toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    .toLowerCase()
}

// --- AlMuslim Prayer Times ---

function initPrayerTimes() {
  const btn = document.getElementById('get-location-btn')
  const list = document.getElementById('prayer-times-list')

  if (!btn || !list) return

  btn.addEventListener('click', () => {
    btn.textContent = 'locating...'
    btn.disabled = true

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          await fetchPrayerTimes(lat, lon)
          btn.textContent = 'updated'
          setTimeout(() => {
            btn.textContent = 'use my location'
            btn.disabled = false
          }, 5000)
        },
        (err) => {
          list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">location access denied.</p>`
          btn.textContent = 'use my location'
          btn.disabled = false
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">geolocation not supported.</p>`
    }
  })

  async function fetchPrayerTimes(lat, lon) {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const dateStr = `${dd}-${mm}-${yyyy}`

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 200) {
        const timings = data.data.timings
        const relevant = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
        list.innerHTML = relevant
          .map((key) => {
            return `
            <div class="prayer-time-item">
              <span class="text-dim" style="font-size: 0.7rem; display: block; margin-bottom: 2px;">${key.toLowerCase()}</span>
              <span class="ui-font" style="font-size: 0.9rem; font-weight: 700;">${timings[key]}</span>
            </div>
          `
          })
          .join('')
      } else {
        throw new Error('API error')
      }
    } catch (err) {
      list.innerHTML = `<p class="text-red" style="font-size: 0.85rem;">failed to fetch times.</p>`
    }
  }

  // Prayer Times Widget Responsive Wrap
  const prayerList = document.getElementById('prayer-times-list')
  if (prayerList) {
    prayerList.style.flexWrap = 'wrap'
    prayerList.style.justifyContent = 'center'
    prayerList.style.gap = '15px'
  }
}

function initMobileMenu() {
  const mobileBtn = document.querySelector('.mobile-menu-btn')
  const navContainer = document.querySelector('.nav-links') || document.querySelector('.nav-list')

  if (mobileBtn && navContainer) {
    mobileBtn.setAttribute('type', 'button')
    mobileBtn.setAttribute('aria-label', 'open navigation')
    mobileBtn.setAttribute('aria-expanded', 'false')

    const syncMenuState = () => {
      const isOpen = navContainer.classList.contains('nav-active')
      mobileBtn.textContent = isOpen ? '✕' : '☰'
      mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
      mobileBtn.setAttribute('aria-label', isOpen ? 'close navigation' : 'open navigation')
    }

    mobileBtn.addEventListener('click', () => {
      navContainer.classList.toggle('nav-active')
      syncMenuState()
    })

    navContainer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navContainer.classList.remove('nav-active')
        syncMenuState()
      })
    })

    window.addEventListener('resize', () => {
      if (window.innerWidth > 600) {
        navContainer.classList.remove('nav-active')
        syncMenuState()
      }
    })

    syncMenuState()
  }
}

function initTheme() {
  try {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn')
    const html = document.documentElement
    const savedTheme = localStorage.getItem('theme') || 'dark'

    // Icons
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`

    // Apply initial theme immediately to avoid flash
    if (savedTheme === 'light') {
      html.setAttribute('data-theme', 'light')
    } else {
      html.removeAttribute('data-theme')
    }

    // Update all buttons
    const updateIcons = (theme) => {
      toggleBtns.forEach((btn) => {
        btn.innerHTML = theme === 'light' ? moonIcon : sunIcon
        btn.setAttribute(
          'aria-label',
          theme === 'light' ? 'switch to dark mode' : 'switch to light mode'
        )
      })
    }

    updateIcons(savedTheme)

    // Toggle handler
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const currentTheme = html.getAttribute('data-theme')
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'

        if (newTheme === 'light') {
          html.setAttribute('data-theme', 'light')
        } else {
          html.removeAttribute('data-theme')
        }

        localStorage.setItem('theme', newTheme)
        updateIcons(newTheme)
      })
    })
  } catch (error) {
    console.warn('// infiniware system: theme initialization exception handled')
  }
}



