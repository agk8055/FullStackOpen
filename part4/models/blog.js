const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: String,
  url: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to the User model
  }
})

// Transform the document before returning it as JSON
blogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString() // Convert _id to string 'id'
    delete returnedObject._id // Remove the original _id
    delete returnedObject.__v // Remove the Mongoose version key
  }
})

module.exports = mongoose.model('Blog', blogSchema)