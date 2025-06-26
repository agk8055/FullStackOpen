const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config') // To get the JWT secret

// Login endpoint
loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const user = await User.findOne({ username })
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  // Create token payload
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  // Generate JWT
  const token = jwt.sign(userForToken, config.SECRET, { expiresIn: 60*60 }) // Token expires in 1 hour

  response
    .status(200)
    .send({ token, username: user.username, name: user.name })
})

module.exports = loginRouter