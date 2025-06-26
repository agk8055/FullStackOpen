const info = (...params) => {
    if (process.env.NODE_ENV !== 'test') { // Don't log info messages during tests
      console.log(...params)
    }
  }
  
  const error = (...params) => {
    console.error(...params)
  }
  
  module.exports = {
    info,
    error
  }