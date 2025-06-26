const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app') // Import your Express app
const Blog = require('../models/blog')
const User = require('../models/user')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')

const api = supertest(app) // Create a supertest agent for making HTTP requests

// Before each test, clear the database and re-seed it with initial data
beforeEach(async () => {
  // Clear all blogs and users
  await Blog.deleteMany({})
  await User.deleteMany({})

  // Create a test user
  const passwordHash = await bcrypt.hash('secretpassword', 10)
  const user = new User({ username: 'root', name: 'Super User', passwordHash })
  await user.save()

  // Add blogs, associating them with the created user
  const blogObjects = helper.initialBlogs.map(blog => new Blog({ ...blog, user: user._id }))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)

  // Update the user's blogs array after saving all blogs
  const savedBlogs = await Blog.find({ user: user._id })
  user.blogs = savedBlogs.map(blog => blog._id)
  await user.save()
}, 100000) // Increase timeout for beforeEach if seeding takes long

describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })

  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs')
    const titles = response.body.map(r => r.title)
    expect(titles).toContain('React patterns')
  })

  test('blogs have an "id" property instead of "_id"', async () => {
    const response = await api.get('/api/blogs')
    const blog = response.body[0]
    expect(blog.id).toBeDefined()
    expect(blog._id).toBeUndefined()
  })
})

describe('addition of a new blog', () => {
  let token = null
  beforeEach(async () => {
    const userCredentials = {
      username: 'root',
      password: 'secretpassword'
    }
    const response = await api
      .post('/api/login')
      .send(userCredentials)

    token = response.body.token
  })

  test('succeeds with valid data and a valid token', async () => {
    const newBlog = {
      title: 'A New Blog Post',
      author: 'Test User',
      url: 'http://testblog.com/new',
      likes: 5
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)
    const titles = blogsAtEnd.map(b => b.title)
    expect(titles).toContain('A New Blog Post')
  })

  test('likes property defaults to 0 if missing', async () => {
    const newBlog = {
      title: 'Blog Without Likes',
      author: 'Anonymous',
      url: 'http://nolikes.com',
    }

    const response = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body.likes).toBe(0)
  })

  test('fails with status 400 if title or url are missing', async () => {
    const invalidBlogNoTitle = {
      author: 'Test User',
      url: 'http://notitle.com',
      likes: 2
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidBlogNoTitle)
      .expect(400)

    const invalidBlogNoUrl = {
      title: 'No URL',
      author: 'Test User',
      likes: 2
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidBlogNoUrl)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })

  test('fails with status 401 if token is not provided', async () => {
    const newBlog = {
      title: 'Unauthorized Blog',
      author: 'Test User',
      url: 'http://unauth.com',
      likes: 1
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })

  test('fails with status 401 if token is invalid', async () => {
    const newBlog = {
      title: 'Invalid Token Blog',
      author: 'Test User',
      url: 'http://invalidtoken.com',
      likes: 1
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer invalidtoken123`)
      .send(newBlog)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('deletion of a blog', () => {
  let token = null
  let user = null
  beforeEach(async () => {
    // Ensure we have a user and a token for that user
    const userCredentials = {
      username: 'root',
      password: 'secretpassword'
    }
    const loginResponse = await api
      .post('/api/login')
      .send(userCredentials)

    token = loginResponse.body.token
    user = (await helper.usersInDb())[0] // Get the user object from DB

    // Add a blog owned by 'root' user to be deleted
    const blogToDelete = {
      title: 'Blog to be deleted',
      author: 'Root User',
      url: 'http://delete.me',
      likes: 0
    }
    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(blogToDelete)
      .expect(201)
  })

  test('succeeds with status 204 if id is valid and user is owner', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart.find(blog => blog.title === 'Blog to be deleted')

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1)
    const titles = blogsAtEnd.map(b => b.title)
    expect(titles).not.toContain(blogToDelete.title)

    // Verify blog also removed from user's blogs array
    const updatedUser = await User.findById(user.id)
    expect(updatedUser.blogs.map(id => id.toString())).not.toContain(blogToDelete.id)
  })

  test('fails with status 401 if token is not provided', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart.find(blog => blog.title === 'Blog to be deleted')

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length)
  })

  test('fails with status 403 if user is not the owner of the blog', async () => {
    // Create another user
    await api
      .post('/api/users')
      .send({ username: 'seconduser', name: 'Second User', password: 'password2' })
      .expect(201)

    // Login as second user to get their token
    const secondUserLoginResponse = await api
      .post('/api/login')
      .send({ username: 'seconduser', password: 'password2' })
      .expect(200)
    const secondUserToken = secondUserLoginResponse.body.token

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart.find(blog => blog.title === 'Blog to be deleted') // This blog is owned by 'root'

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(403) // Forbidden

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length) // Blog should still exist
  })
})

describe('updating a blog', () => {
  test('succeeds with status 200 and updates the blog', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0] // Pick the first blog
    const updatedLikes = blogToUpdate.likes + 1

    const newBlogData = { ...blogToUpdate, likes: updatedLikes }

    const response = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(newBlogData)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.likes).toBe(updatedLikes)
    expect(response.body.title).toBe(blogToUpdate.title) // Ensure other fields are unchanged
  })

  test('fails with status 404 if blog does not exist', async () => {
    const nonExistentId = await helper.nonExistingId()
    const newBlogData = {
      title: 'Non-existent Update',
      author: 'Someone',
      url: 'http://nonexistent.com',
      likes: 10
    }

    await api
      .put(`/api/blogs/${nonExistentId}`)
      .send(newBlogData)
      .expect(404)
  })

  test('fails with status 400 if id is malformatted', async () => {
    const invalidId = '12345'

    const newBlogData = {
      title: 'Invalid ID',
      author: 'Someone',
      url: 'http://invalidid.com',
      likes: 10
    }

    await api
      .put(`/api/blogs/${invalidId}`)
      .send(newBlogData)
      .expect(400)
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})