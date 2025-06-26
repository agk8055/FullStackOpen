const config = require('./utils/config')
const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const blogsRouter = require('./controllers/blogs')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const mongoose = require('mongoose')

// Conditional DB connection for tests only
if (process.env.NODE_ENV === 'test') {
  logger.info('Connecting to TEST database (via app.js for tests)')
  // Use config.MONGODB_URI, as config.js already determined if it's the test URI
  mongoose.connect(config.MONGODB_URI)
    .then(() => logger.info('Connected to TEST MongoDB'))
    .catch(error => logger.error('Error connecting to TEST MongoDB:', error.message))
} else {
  // In development/production, DB connection is handled by index.js
  logger.info('App will use DB connection from index.js (production/development)')
}

// --- Middleware ---
app.use(cors())
app.use(express.static('build'))
app.use(express.json())
app.use(middleware.requestLogger)

// --- Routes ---
app.use('/api/blogs', blogsRouter)
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)

// --- Error Handling Middleware (must be last) ---
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app