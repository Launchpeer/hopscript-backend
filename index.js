/**
 * Basic Node / Express server setup
 *
 * Installing Parse as middleware on top of express if we later wish to run our own express server in tandem
 */

const express = require('express')
const ParseServer = require('parse-server').ParseServer
const app = express()
const config = require('./config')
const path = require('path')
const PORT = process.env.PORT || 1337
const ParseDashboard = require('parse-dashboard')
const productionDirectoryLocation =
  __dirname + '/apns_push_certs/production/apns_production.p12'
const sandboxDirectoryLocation =
  __dirname + '/apns_push_certs/sandbox/apns_sandbox.p12'
const sendgrid = require('parse-server-sendgrid-adapter')

/**
 * Parse server options
 */
const options = {
  appName: config.PARSE_DASHBOARD_APP_NAME,
  emailAdapter: sendgrid({
    apiKey: config.SENDGRID_API_KEY,
    fromAddress: config.SENDGRID_FROM_EMAIL
  }),
  cloud: __dirname + '/cloud/main.js',
  databaseURI: config.MONGODB_URI,
  appId: config.PARSE_APP_ID,
  masterKey: config.PARSE_MASTER_KEY,
  serverURL: config.PARSE_SERVER_URL,
  clientKey: config.PARSE_CLIENT_KEY,
  publicServerURL: config.PARSE_SERVER_URL,
  javascriptKey: config.PARSE_CLIENT_KEY,
  push: {
    ios: [
      //create and support both sandbox and production
      {
        pfx: sandboxDirectoryLocation,
        passphrase: config.APNS_PASSPHRASE,
        bundleId: config.APPLE_BUNDLE_ID,
        production: false
      },

      // issue created on github: https://github.com/parse-community/parse-server/issues/3911
      // setting value to true even though its a production cert crashes server

      {
        pfx: productionDirectoryLocation,
        passphrase: config.APNS_PASSPHRASE,
        bundleId: config.APPLE_BUNDLE_ID,
        production: false
      }
    ]
  }
}
const api = new ParseServer(options)
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
)
// server up parse api
app.use(config.PARSE_SERVER_MOUNT, api)
app.use('/dashboard', dashboard)
app.listen(PORT, () => {
  console.log(`parse server running on ${PORT}`)
})
