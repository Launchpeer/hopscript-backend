const routes = require('./routes')

/**
 * Place Parse Cloud Code Here
 */

Parse.Cloud.define('test_push_services', function(req, res) {
  Parse.Push.send({
    data: {
      alert: 'This is a test from Parse Server'
    }
  })
})

Parse.Cloud.define('resetPassword', (req, response) => {
  const query = new Parse.Query(Parse.User)

  query.equalTo('username', req.params.username)

  query.first({
    useMasterKey: true,
    success(user) {
      const newPassword = req.params.password

      user.setPassword(newPassword)

      user.save(null, {
        useMasterKey: true,
        success(resUser) {
          // The user was saved correctly
          response.success('RESET PASSWORD FOR:', resUser)
        },
        error(error) {
          response.error('Erro ao salvar nova senha', error)
        }
      })
    },
    error(error) {
      response.error(`User does not exist.${error}`)
    }
  })
})
