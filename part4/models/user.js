const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator') // For unique username validation

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensures username is unique
    minlength: 3 // Minimum length for username
  },
  name: String,
  passwordHash: {
    type: String,
    required: true
  },
  blogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog' // Array of references to Blog models
    }
  ]
})

// Apply the uniqueValidator plugin to userSchema
userSchema.plugin(uniqueValidator)

// Transform the document before returning it as JSON
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString() // Convert _id to string 'id'
    delete returnedObject._id // Remove the original _id
    delete returnedObject.__v // Remove the Mongoose version key
    delete returnedObject.passwordHash // NEVER expose password hashes
  }
})

module.exports = mongoose.model('User', userSchema)