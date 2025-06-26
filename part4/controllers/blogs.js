const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user') // Needed to update user's blogs array
const middleware = require('../utils/middleware') // For token and user extraction

// Get all blogs
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

// Get a single blog by ID
blogsRouter.get('/:id', async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate('user', { username: 1, name: 1 })
  if (blog) {
    response.json(blog)
  } else {
    response.status(404).end() // Not found
  }
})

// Create a new blog (requires token and user authentication)
blogsRouter.post('/', middleware.tokenExtractor, middleware.userExtractor, async (request, response) => {
  const { title, author, url, likes } = request.body

  // Check if user is authenticated and available via middleware
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const user = request.user // User object attached by userExtractor middleware

  const blog = new Blog({
    title,
    author,
    url,
    likes: likes || 0, // Default likes to 0 if not provided
    user: user._id // Link blog to the authenticated user
  })

  const savedBlog = await blog.save()

  // Add the blog's ID to the user's blogs array
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  // Populate the user field before sending the response
  const populatedBlog = await savedBlog.populate('user', { username: 1, name: 1 })

  response.status(201).json(populatedBlog)
})

// Delete a blog (requires token and user authentication, and ownership)
blogsRouter.delete('/:id', middleware.tokenExtractor, middleware.userExtractor, async (request, response) => {
  // Check if user is authenticated
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const blogToDelete = await Blog.findById(request.params.id)

  if (!blogToDelete) {
    return response.status(204).end() // Already deleted or doesn't exist, no content to send
  }

  // Check if the authenticated user is the owner of the blog
  if (blogToDelete.user.toString() !== request.user.id.toString()) {
    return response.status(403).json({ error: 'you are not authorized to delete this blog' }) // Forbidden
  }

  // Remove blog from user's blogs array
  const user = request.user
  user.blogs = user.blogs.filter(b => b.toString() !== blogToDelete._id.toString())
  await user.save()

  await Blog.findByIdAndDelete(request.params.id)
  response.status(204).end() // No content
})

// Update a blog (e.g., increment likes)
blogsRouter.put('/:id', async (request, response) => {
  const { title, author, url, likes } = request.body

  const blog = {
    title,
    author,
    url,
    likes
  }

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true, runValidators: true, context: 'query' }).populate('user', { username: 1, name: 1 })

  if (updatedBlog) {
    response.json(updatedBlog)
  } else {
    response.status(404).end() // Not found
  }
})

module.exports = blogsRouter