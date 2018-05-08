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
