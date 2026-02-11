/**
 * GUARDIAN MODULE v2.1.0
 * ----------------------------------------------------------------------
 * The Infiniware 'Guardian' system is a client-side moderation layer
 * designed to filter out illicit content (sexual, malware, hacking)
 * while allowing general freedom of speech (profanity is permitted).
 *
 * This module runs in real-time within the user's browser before
 * any data is committed to the Firestore database.
 *
 * CORE FUNCTIONS:
 * - validateContent(text): Scans text for prohibited patterns.
 * - checkGuardianBan(user): Verifies if the user is structurally banned.
 * - logActivity(action, meta): [Internal] telemetry for analysis.
 */

import { auth, db } from './firebase-init.js'
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'

// ======================================================================
// 1. CONFIGURATION & DICTIONARIES
// ======================================================================

const GUARDIAN_CONFIG = {
  strictMode: true,
  logViolations: true,
  maxViolationThreshold: 3 // Future use: auto-ban after 3 strikes
}

/**
 * BANNED_KEYWORDS
 * Category: SEXUAL / PORNOGRAPHIC
 * Context: Strictly prohibited.
 */
const LIST_SEXUAL = [
  'porn',
  'pornography',
  'xxx',
  'nude',
  'nudity',
  'sex',
  'sexual',
  'erotic',
  'hentai',
  'camgirl',
  'blowjob',
  'anal',
  'oral',
  'dick',
  'pussy',
  'vagina',
  'penis',
  'cum',
  'sperm',
  'orgasm',
  'fetish',
  'bondage',
  'bdsm',
  'incest',
  'pedophile',
  'pedo',
  'rape',
  'molest',
  'masturbate',
  'masturbation',
  'tit',
  'tits',
  'boob',
  'boobs',
  'nipple',
  'clitoris',
  'vulva',
  'cock',
  'milf',
  'dilf',
  'twink',
  'femboy',
  'tranny',
  'shemale',
  'onlyfans',
  'pornhub',
  'xvideos',
  'brazzers',
  'xhamster',
  'nsfw',
  'nsfl',
  'hardcore',
  'softcore',
  'gangbang',
  'threesome',
  'bukkake',
  'creampie',
  'deepthroat',
  'doggystyle',
  'facials',
  'finger',
  'fingering',
  'fisting',
  'handjob',
  'rimjob',
  'squirt',
  'squirting',
  'swallow',
  'swallowing',
  'voyeur',
  'upskirt',
  'downblouse',
  'jailbait',
  'lolicon',
  'shotacon'
]

/**
 * BANNED_KEYWORDS
 * Category: MALWARE / HACKING / EXPLOITS
 * Context: Strictly prohibited to protect community safety.
 */
const LIST_MALWARE = [
  'malware',
  'virus',
  'trojan',
  'worm',
  'spyware',
  'ransomware',
  'keylogger',
  'rootkit',
  'botnet',
  'adware',
  'scareware',
  'exploit',
  'cve-',
  'zeroday',
  '0day',
  'payload',
  'shellcode',
  'hacking',
  'hacker',
  'hack',
  'warez',
  'ddos',
  'dos attack',
  'denial of service',
  'packet sniffer',
  'sql injection',
  'sqli',
  'xss',
  'cross-site scripting',
  'csrf',
  'rce',
  'remote code execution',
  'buffer overflow',
  'heap spray',
  'brute force',
  'bruteforce',
  'rainbow tables',
  'hashcat',
  'john the ripper',
  'metasploit',
  'kali linux',
  'wireshark',
  'nmap',
  'burp suite',
  'dark web',
  'darknet',
  'tor browser',
  'onion site',
  'silk road',
  'carding',
  'carder',
  'cc dump',
  'fullz',
  'phishing',
  'phish',
  'stealer',
  'rat',
  'remote access tool',
  'fud',
  'fully undetectable',
  'crypter',
  'binder',
  'bot',
  'botting',
  'script kiddie',
  'dox',
  'doxing',
  'swatting'
]

/**
 * BANNED_KEYWORDS
 * Category: HATE SPEECH / EXTREMISM (Basic Cover)
 * Context: While profanity is allowed, targeted hate speech is not.
 */
const LIST_HATE = [
  'nigger',
  'israel',
  'nigga',
  'faggot',
  'kike',
  'spic',
  'chink',
  'wetback',
  'gook',
  'raghead',
  'towelhead',
  'retard',
  'mongoloid',
  'hitler',
  'nazi',
  'white power',
  'kkk',
  'isis',
  'jihad',
  'terrorist',
  'osama bin laden',
  'genocide',
  'suicide',
  'whitey'
]

// Combine all lists for efficient scanning
const BANNED_MASTER_LIST = [...LIST_SEXUAL, ...LIST_MALWARE, ...LIST_HATE]

// ======================================================================
// 2. CORE VALIDATION LOGIC
// ======================================================================

/**
 * Main validation entry point.
 * Scans text against all dictionaries.
 *
 * @param {string} text - The raw user input content.
 * @returns {object} - { valid: boolean, reason: string|null, category: string|null }
 */
// ... (User's list updates are preserved above)

// ======================================================================
// 2. CORE VALIDATION LOGIC
// ======================================================================

/**
 * Main validation entry point.
 * Scans text against all dictionaries and performs heuristic analysis.
 *
 * @param {string} text - The raw user input content.
 * @returns {object} - { valid: boolean, reason: string|null, category: string|null, severity: number }
 */
export function validateContent(text) {
  if (!text || text.trim() === '') {
    return { valid: true, severity: 0 }
  }

  const normalizedText = normalizeText(text)
  let severityScore = 0
  let primaryCategory = null
  let rejectionReason = null

  // 1. Direct Keyword Matching & Severity Calculation
  for (const bannedWord of BANNED_MASTER_LIST) {
    if (normalizedText.includes(bannedWord)) {
      const category = categorizeViolation(bannedWord)
      const wordSeverity = getSeverityForCategory(category)

      severityScore += wordSeverity

      if (!primaryCategory || wordSeverity > getSeverityForCategory(primaryCategory)) {
        primaryCategory = category
        rejectionReason = `Guardian Alert: Content contains prohibited term "${bannedWord}" (${category}).`
      }
    }
  }

  // 2. Heuristic Checks (Obfuscation / Aggression)
  if (detectObfuscation(text)) {
    severityScore += 30 // High suspicion
    if (!primaryCategory) {
      primaryCategory = 'OBFUSCATION'
      rejectionReason = 'Guardian Alert: Potential obfuscated illicit content detected.'
    }
  }

  // 3. Repeating Character Check (Spam/Aggression)
  if (/(.)\1{9,}/.test(text)) {
    // 10+ same chars
    severityScore += 10
    if (!primaryCategory) {
      primaryCategory = 'SPAM'
      rejectionReason = 'Guardian Alert: Excessive repeating characters.'
    }
  }

  // Decision Logic
  // Threshold can be tuned.
  // Strict mode: any detection (Severity > 0) is a block.
  // Lenient mode: only block if Severity > 50.

  if (severityScore > 0) {
    return {
      valid: false,
      reason: rejectionReason,
      category: primaryCategory,
      severity: severityScore
    }
  }

  return { valid: true, severity: 0 }
}

/**
 * Normalizes text for analysis.
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s{2,}/g, ' ')
}

/**
 * Identifies which list the violation belongs to.
 */
function categorizeViolation(word) {
  if (LIST_SEXUAL.includes(word)) return 'SEXUAL_CONTENT'
  if (LIST_MALWARE.includes(word)) return 'MALWARE_HACKING'
  if (LIST_HATE.includes(word)) return 'HATE_SPEECH'
  return 'UNKNOWN'
}

/**
 * Assigns a severity score based on category.
 * 0-100 scale.
 */
function getSeverityForCategory(category) {
  switch (category) {
    case 'SEXUAL_CONTENT':
      return 100 // Immediate block
    case 'MALWARE_HACKING':
      return 100 // Immediate block
    case 'HATE_SPEECH':
      return 80 // High severity
    case 'OBFUSCATION':
      return 50
    case 'SPAM':
      return 20
    default:
      return 10
  }
}

/**
 * Basic heuristic detection for common obfuscation patterns.
 */
function detectObfuscation(text) {
  const patterns = [/p[0o]rn/i, /h[4a]ck/i, /x[x]+/, /s[3e]x/i]
  return patterns.some((p) => p.test(text))
}

// ======================================================================
// 3. USER MANAGEMENT & BAN SYSTEM
// ======================================================================

export async function checkGuardianBan(user) {
  if (!user) return false

  try {
    const userRef = doc(db, 'users', user.uid)
    const snap = await getDoc(userRef)

    if (snap.exists()) {
      const data = snap.data()
      if (data.banned === true) {
        console.warn(`Guardian: User ${user.uid} is banned. Enforcing lockout.`)
        enforceBanUI(data.banReason || 'Violation of community guidelines')
        return true
      }
    }
  } catch (err) {
    console.error('Guardian: Failed to verify user status.', err)
    return false
  }
  return false
}

/**
 * Locks the UI visually and functionality.
 */
function enforceBanUI(reason) {
  // 1. Find or create overlay
  const overlayId = 'banned-overlay'
  let overlay = document.getElementById(overlayId)

  if (overlay) {
    overlay.style.display = 'flex'
    // Update reason
    const reasonEl = overlay.querySelector('.text-dim.mt-sm')
    if (reasonEl) reasonEl.textContent = `reason: ${reason}`
  }

  // 2. Disable interactions
  document.body.style.overflow = 'hidden' // Stop scrolling

  // 3. Obfuscate background (optional, simple blur)
  const container = document.querySelector('.container')
  if (container) container.style.filter = 'blur(10px)'
}

// ======================================================================
// 4. TELEMETRY & REPORTING (INTERNAL)
// ======================================================================

/**
 * Logs violation attempts to Firestore (Optional feature).
 * This helps admins see what's being blocked.
 */
async function logViolation(user, content, violation) {
  // In a real app, write to a 'logs' collection.
  // For this implementation, we just console log to keep it client-side only as requested.
  console.group('Guardian Violation Log')
  console.log('User:', user.uid)
  console.log('Content:', content)
  console.log('Violation:', violation)
  console.groupEnd()
}

/**
 * Admin: Ban a user manually.
 * (Requires Firestore security rules to allow this, usually admin-only)
 */
export async function banUser(targetUid, reason) {
  try {
    const targetRef = doc(db, 'users', targetUid)
    await updateDoc(targetRef, {
      banned: true,
      banReason: reason,
      bannedAt: serverTimestamp()
    })
    console.log(`Guardian: User ${targetUid} has been banned.`)
  } catch (e) {
    console.error('Guardian: Ban action failed.', e)
  }
}

// ======================================================================
// 5. EXPORT
// ======================================================================

export default {
  validateContent,
  checkGuardianBan,
  banUser
}
