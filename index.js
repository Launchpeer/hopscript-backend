/**
 * Basic Node / Express server setup
 *
 * Installing Parse as middleware on top of express if we later wish to run our own express server in tandem
 */

const express = require('express');
const { ParseServer } = require('parse-server');

const app = express();
const config = require('./config');

const PORT = process.env.PORT || 1337;
const ParseDashboard = require('parse-dashboard');
const sendgrid = require('parse-server-sendgrid-adapter');
require('dotenv').config();

const S3Adapter = require('@parse/s3-files-adapter');

/**
 * Parse server options
 */

const s3Adapter = new S3Adapter(
  config.S3_ACCESS_KEY,
  config.S3_SECRET_KEY,
  config.S3_BUCKET, {
    region: 'us-east-1',
    directAccess: true,
    globalCacheControl: 'public, max-age=86400' // 24 hrs Cache-Control.
  }
);

const options = {
  loggerAdapter: {
    module: "parse-server/lib/Adapters/Logger/WinstonLoggerAdapter",
    options: {
      logLevel: config.DEBUG ? "info" : "error"
    }
  },
  appName: config.PARSE_DASHBOARD_APP_NAME,
  emailAdapter: sendgrid({
    apiKey: config.SENDGRID_API_KEY,
    fromAddress: config.SENDGRID_FROM_EMAIL
  }),
  cloud: `${__dirname}/cloud/main.js`,
  databaseURI: config.MONGODB_URI,
  appId: config.PARSE_APP_ID,
  masterKey: config.PARSE_MASTER_KEY,
  serverURL: config.PARSE_SERVER_URL,
  clientKey: config.PARSE_CLIENT_KEY,
  publicServerURL: config.PARSE_SERVER_URL,
  javascriptKey: config.PARSE_CLIENT_KEY,
  liveQuery: {
    classNames: ['User', 'Script', 'Question', 'Answer']
  },
  customPages: {
    invalidLink: `${config.PORTAL_URL}/`,
    verifyEmailSuccess: `${config.PORTAL_URL}/verified`,
    choosePassword: `${config.PORTAL_URL}/reset-password`
  },
  filesAdapter: s3Adapter,
};
const api = new ParseServer(options);
// supportedPushLocales added due to this issue: https://github.com/parse-community/parse-dashboard/issues/811
// waiting for fix to upgrade to newest package
const dashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: config.PARSE_SERVER_URL,
        appId: config.PARSE_APP_ID,
        masterKey: config.PARSE_MASTER_KEY,
        appName: config.PARSE_DASHBOARD_APP_NAME,
        javascriptKey: config.PARSE_CLIENT_KEY,
        clientKey: config.PARSE_CLIENT_KEY,
        supportedPushLocales: []
      }
    ],
    users: [
      {
        user: config.PARSE_ADMIN_USERNAME,
        pass: config.PARSE_ADMIN_PASSWORD
      }
    ]
  },
  {
    allowInsecureHTTP: true
  }
);
// server up parse api
app.use(config.PARSE_SERVER_MOUNT, api);
app.use('/dashboard', dashboard);

const httpServer = require('http').createServer(app);

httpServer.listen(PORT, () => {
  console.log(`parse server running on ${PORT}`);
});

const parseLiveQuery = ParseServer.createLiveQueryServer(httpServer);
