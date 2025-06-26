const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const User = require('../models/user')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')

const api = supertest(app)

// This beforeEach hook runs before each test in this suite.
// It clears the User collection and creates one initial test user.
beforeEach(async () => {
  await User.deleteMany({}) // Clear all users

  // Create a default test user for scenarios that require login
  const passwordHash = await bcrypt.hash('testpassword', 10)
  const user = new User({ username: 'testuser', name: 'Test User', passwordHash })
  await user.save()
})

describe('user creation', () => {
  test('succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb() // Get initial users count

    const newUser = {
      username: 'newuser',
      name: 'New User',
      password: 'password123',
    }

    // Attempt to create a new user
    await api
      .post('/api/users')
      .send(newUser)
      .expect(201) // Expect status 201 Created
      .expect('Content-Type', /application\/json/) // Expect JSON response

    const usersAtEnd = await helper.usersInDb() // Get users count after the operation
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1) // Expect one more user
    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username) // Expect the new username to be present
  })

  test('fails with proper status code and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb() // Get initial users count

    const newUser = {
      username: 'testuser', // This username already exists from beforeEach
      name: 'Duplicate User',
      password: 'password123',
    }

    // Attempt to create a user with a duplicate username
    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Expect status 400 Bad Request
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('expected `username` to be unique') // Check error message
    // Expect no new user to be added
    const usersAtEnd = await helper.usersInDb() // Re-fetch to confirm no change
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('fails with status 400 if username is missing', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'No Username',
      password: 'password123',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)

    // Database should not have changed
    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('fails with status 400 if password is missing', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'userNoPass',
      name: 'User No Password',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)

    // Database should not have changed
    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('fails with status 400 if username is less than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'ab', // Too short
      name: 'Short Username',
      password: 'password123',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('Path `username` (`ab`) is shorter than the minimum allowed length (3).')
    // Crucial fix here: expect the count to be the same as at the start, no new user added
    const usersAtEnd = await helper.usersInDb() // Re-fetch to confirm no change
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('fails with status 400 if password is less than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'validuser',
      name: 'Short Password',
      password: 'ab', // Too short
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password must be at least 3 characters long')
    // Crucial fix here: expect the count to be the same as at the start, no new user added
    const usersAtEnd = await helper.usersInDb() // Re-fetch to confirm no change
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
})

// Close the Mongoose connection after all tests in this file are done
afterAll(async () => {
  await mongoose.connection.close()
})