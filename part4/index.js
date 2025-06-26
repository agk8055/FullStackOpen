const app = require('./app') // The Express app configuration
const config = require('./utils/config') // Configuration variables (PORT, MONGODB_URI)
const logger = require('./utils/logger') // Custom logger utility
const mongoose = require('mongoose') // Mongoose for MongoDB interaction

mongoose.set('strictQuery', false) // Suppress Mongoose strictQuery warning

logger.info('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('connected to MongoDB')
    app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT}`)
    })
  })
  .catch((error) => {
    logger.error('error connecting to MongoDB:', error.message)
  })