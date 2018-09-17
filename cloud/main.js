/**
 * Place Parse Cloud Code Here
 */

Parse.Cloud.define('test_push_services', () => {
  Parse.Push.send({
    data: {
      alert: 'This is a test from Parse Server'
    }
  });
});

Parse.Cloud.define('resetPassword', (req, response) => {
  const query = new Parse.Query(Parse.User);

  query.equalTo('username', req.params.username);
  query.first({
    useMasterKey: true,
    success(user) {
      const newPassword = req.params.password;

      user.setPassword(newPassword);
      user.set('firstLogin', 'true');
      user.save(null, {
        useMasterKey: true,
        success(resUser) {
          // The user was saved correctly
          response.success('RESET PASSWORD FOR:', resUser);
        },
        error(error) {
          response.error('Erro ao salvar nova senha', error);
        }
      });
    },
    error(error) {
      response.error(`User does not exist.${error}`);
    }
  });
});

Parse.Cloud.define('removeUser', (req, res) => {
  if (!req.params.userId) {
    return res.error('Param: userId is required');
  }
  const query = new Parse.Query(Parse.User);
  query
    .get(req.params.userId, { useMasterKey: true })
    .then((user) => {
      if (!user) {
        return res.error(`User with objectId ${req.params.userId} does not exist`);
      }
      return user.destroy({ useMasterKey: true });
    })
    .then(obj => res.success(obj))
    .catch(err => res.error(err));
});


/**
 * As a brokerage I want to delete my account, or,
 * As a broker I want to remove an Agent from my Brokerage
 *
 * After removeUser is complete, this afterDelete function is called by Parse automatically
 * We check if the User that was just deleted is a Brokerage
 * If so, we delete the Brokerage and then the Agents the Brokerage added
 *
 *
 * After removeAgent is complete, this afterDelete function is called by Parse automatically
 * We check if the User that was just deleted is an Agent
 * If so, we get the Brokerage Pointer object from the Agent and query Users for a matching Brokerage id
 * The Agent Pointer is then removed from the Brokerage and the Brokerage is saved
 */


Parse.Cloud.afterDelete(Parse.User, (req, res) => {
  const userObj = req.object;
  if (userObj.get('role') === 'brokerage') {
    const agents = userObj.get('agents');
    const query = new Parse.Query('User');
    agents.map(agent =>
      query.get(agent.objectId, { useMasterKey: true })
        .then(() => {
          agent.destroy({ useMasterKey: true });
          res.success("AGENT REMOVED");
        }));
  } else if (userObj.get('role') === 'agent') {
    const brokerage = userObj.get('brokerage');
    if (brokerage) {
      const query = new Parse.Query('User');
      query.get(brokerage.id, { useMasterKey: true })
        .then((b) => {
          b.remove("agents", req.object);
          b.save(null, { useMasterKey: true });
          res.success("AGENTS REMOVED FROM", b.id);
        });
    }
  }
});

const fetchUser = (id) => {
  const userQuery = new Parse.Query('User');
  userQuery.include('agents');
  userQuery.include('leads');
  userQuery.include('leadGroups');
  return userQuery.get(id, { useMasterKey: true });
};


module.exports = {
  fetchUser
};
