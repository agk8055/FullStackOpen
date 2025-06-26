const logger = require('./logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const config = require('./config')

// Logs incoming request details
const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

// Extracts the JWT token from the Authorization header
const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
  } else {
    request.token = null
  }
  next()
}

// Extracts the user object from the database based on the token
const userExtractor = async (request, response, next) => {
  if (request.token) {
    try {
      const decodedToken = jwt.verify(request.token, config.SECRET)
      if (!decodedToken.id) {
        request.user = null
      } else {
        request.user = await User.findById(decodedToken.id)
      }
    } catch (error) {
      request.user = null // Token is invalid or expired
    }
  } else {
    request.user = null // No token provided
  }
  next()
}

// Handles requests to unknown endpoints (404 Not Found)
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// Centralized error handling middleware
const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token invalid' })
  } else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({ error: 'token expired' })
  }

  next(error) // Pass other errors to the default Express error handler
}

module.exports = {
  requestLogger,
  tokenExtractor,
  userExtractor,
  unknownEndpoint,
  errorHandler
}