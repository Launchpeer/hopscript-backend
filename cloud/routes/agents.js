const config = require('../../config');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.SENDGRID_API_KEY);

/**
 * As a broker I want to send an agent an invite email

 A sendgrid message object is instantiated and sent to the agent.

 Loading and Errors are handled for UX

 * @param  {string} email email address of Agent
 * @param  {string} brokerage username of Brokerage that is inviting the Agent
 * @param  {string} password password generated for the Agent
 * @param  {string} brokerageEmail email address of the Brokerage
 */

Parse.Cloud.define('sendEmailInvite', function(req, res) {
  const msg = {
    to: req.params.email,
    from: 'no-reply@swiftscript.com',
    subject: 'Temporary Password',
    text: `You’ve been invited to use Swift Script by ${req.params.brokerage}, to get started, follow this link https://swiftscript.herokuapp.com/. Login with this email address and your temporary password: ${req.params.password}. To access your account. If you have questions about why you received this email, please contact ${req.params.brokerageEmail}`
  };
  sgMail.send(msg);
  return res.success("email sent");
})

/**
 * As a broker I want to remove an Agent from my Brokerage
 *
 * We query the database for Users, using the Agent's id
 * If found, the Agent is removed from the database
 * Removing the Agent will trigger an afterDelete to be called
 * Loading and Errors are handled for UX

 * @param  {string} agentId the Agent's parse Id
 */
Parse.Cloud.define('removeAgent', function(req, res) {
  const query = new Parse.Query(Parse.User);
  query.get(req.params.agentId, { useMasterKey: true })
    .then((agent) => {
      if (!agent) { return res.error(`User with agentId ${req.params.agentId} does not exist`); }
      return agent.destroy({ useMasterKey: true });
    })
    .then(obj => res.success(obj))
    .catch(err => res.error(err));
})

/**
 * As a broker I want to remove an Agent from my Brokerage
 *
 * After removeAgent is complete, this afterDelete function is called by Parse automatically
 * We check if the User that was just deleted is an Agent
 * If so, we get the Brokerage Pointer object from the Agent and query Users for a matching Brokerage id
 * The Agent Pointer is then removed from the Brokerage and the Brokerage is saved
 */

Parse.Cloud.afterDelete(Parse.User, (req, res) => {
  const userObj = req.object;
  if (userObj.get('role') === 'agent') {
    const brokerage = userObj.get('brokerage');
    const query = new Parse.Query('User');
    query.get(brokerage.id, { useMasterKey: true })
    .then((b) => {
      b.remove("agents", req.object);
      b.save(null, { useMasterKey: true });
      res.success("AGENTS REMOVED FROM", b.id);
    });
  }
});
