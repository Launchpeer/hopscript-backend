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

Parse.Cloud.define('removeUser', (req, res) => {
  if (!req.params.userId) {
    return res.error('Param: userId is required')
  }
  const query = new Parse.Query(Parse.User)
  query
    .get(req.params.userId, { useMasterKey: true })
    .then(user => {
      if (!user) {
        return res.error(
          `User with objectId ${req.params.userId} does not exist`
        )
      }
      return user.destroy({ useMasterKey: true })
    })
    .then(obj => res.success(obj))
    .catch(err => res.error(err))
})
