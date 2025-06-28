describe('Blog app', function() {
  beforeEach(function() {
    cy.request('POST', 'http://localhost:3003/api/testing/reset')
    const user = {
      name: 'Test User',
      username: 'testuser',
      password: 'password'
    }
    cy.request('POST', 'http://localhost:3003/api/users/', user) 
    cy.visit('http://localhost:5173')
  })

  it('Login form is shown', function() {
    cy.contains('login')
  })

  describe('Login',function() {
    it('succeeds with correct credentials', function() {
      cy.get('input:first').type('testuser')
      cy.get('input:last').type('password')
      cy.contains('login').click()
      cy.contains('Test User logged in')
    })

    it('fails with wrong credentials', function() {
      cy.get('input:first').type('testuser')
      cy.get('input:last').type('wrong')
      cy.contains('login').click()

      cy.get('.error')
        .should('contain', 'wrong credentials')
        .and('have.css', 'color', 'rgb(255, 0, 0)')
        .and('have.css', 'border-style', 'solid')

      cy.get('html').should('not.contain', 'Test User logged in')
    })
  })

  describe('When logged in', function() {
    beforeEach(function() {
      cy.login({ username: 'testuser', password: 'password' })
    })

    it('A blog can be created', function() {
      cy.contains('new blog').click()
      cy.get('input[name="title"]').type('A new blog')
      cy.get('input[name="author"]').type('Test Author')
      cy.get('input[name="url"]').type('http://test.com')
      cy.contains('create').click()
      cy.contains('A new blog Test Author')
    })

    describe('and a blog exists', function () {
      beforeEach(function () {
        cy.createBlog({ title: 'another blog', author: 'another author', url: 'http://another.com' })
      })

      it('it can be liked', function () {
        cy.contains('view').click()
        cy.contains('like').click()
        cy.contains('likes 1')
      })

      it('it can be deleted by the user who created it', function () {
        cy.contains('view').click()
        cy.contains('remove').click()
        cy.get('html').should('not.contain', 'another blog another author')
      })
    })

    describe('and several blogs exist', function () {
      beforeEach(function () {
        cy.createBlog({ title: 'blog with most likes', author: 'author1', url: 'url1', likes: 10 })
        cy.createBlog({ title: 'blog with least likes', author: 'author2', url: 'url2', likes: 1 })
        cy.createBlog({ title: 'blog with medium likes', author: 'author3', url: 'url3', likes: 5 })
      })

      it('they are ordered by likes', function () {
        cy.get('.blog').eq(0).should('contain', 'blog with most likes')
        cy.get('.blog').eq(1).should('contain', 'blog with medium likes')
        cy.get('.blog').eq(2).should('contain', 'blog with least likes')
      })
    })
  })
})
