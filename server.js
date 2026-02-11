/**
 * Infiniware website server
 * Serves static site and optional API. Run: npm start or npm run dev
 */

const express = require('express')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const PUBLIC = path.join(__dirname)

app.use(cors())
app.use(express.json())

// Static files (HTML, CSS, JS, assets)
app.use(express.static(PUBLIC))

// SPA-style fallback: any unknown path serves index
app.get('*', (req, res, next) => {
  if (path.extname(req.path)) return next()
  res.sendFile(path.join(PUBLIC, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Infiniware server running at http://localhost:${PORT}`)
})
