require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://heroku_7n9jstt5:2s136alif7i719acuemjfvd674@ds263639.mlab.com:63639/heroku_7n9jstt5',
  PARSE_ADMIN_PASSWORD: process.env.PARSE_ADMIN_DASHBOARD_PASSWORD || 'password',
  PARSE_ADMIN_USERNAME: process.env.PARSE_ADMIN_DASHBOARD_USERNAME || 'admin',
  PARSE_APP_ID: process.env.PARSE_APP_ID || 'swiftscript-backend-qa',
  PARSE_CLIENT_KEY: process.env.PARSE_CLIENT_KEY || 'some_key_generated',
  PARSE_DASHBOARD_APP_NAME: process.env.PARSE_DASHBOARD_APP_NAME || 'swiftscript-qa',
  PARSE_MASTER_KEY: process.env.PARSE_MASTER_KEY || 'myMasterKey',
  PARSE_SERVER_MOUNT: process.env.PARSE_SERVER_MOUNT || '/parse',
  PARSE_SERVER_URL: process.env.PARSE_SERVER_URL || 'https://swiftscript-backend-qa.herokuapp.com/parse',
  // PORTAL_URL: process.env.PORTAL_URL || 'https://swiftscript.herokuapp.com',
  PORTAL_URL: process.env.PORTAL_URL || 'http://localhost:8080',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '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',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'info@swiftscript.com',
  STRIPE_API_KEY: process.env.STRIPE_API_KEY || 'sk_test_DNlKsovpvlGFi8fUEaZVVo3L',
};
