const config = require('../../config');

Parse.Cloud.define('sendEmailInvite', function(req, res) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(config.SENDGRID_API_KEY);
  const msg = {
    to: req.params.email,
    from: 'no-reply@swiftscript.com',
    subject: 'Temporary Password',
    text: `You’ve been invited to use Swift Script by ${req.params.brokerage}. To get started, follow this link https://swiftscript.herokuapp.com/. Login with this email address and your temporary password: ${req.params.password}. To access your account. If you have questions about why you received this email, please contact ${req.params.brokerageEmail}`
  };
  sgMail.send(msg);
  return res.success("email sent");
})
