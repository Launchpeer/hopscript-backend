/**
 * Basic Node / Express server setup
 *
 * Installing Parse as middleware on top of express if we later wish to run our own express server in tandem
 */

const express = require('express');
const { ParseServer } = require('parse-server');
const twilio = require('twilio');
const ParseDashboard = require('parse-dashboard');
const sendgrid = require('parse-server-sendgrid-adapter');
const S3Adapter = require('@parse/s3-files-adapter');
const bodyParser = require('body-parser');
const config = require('./config');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
require('dotenv').config();


const {
  PORT,
  MONGODB_URI,
  PARSE_ADMIN_PASSWORD,
  PARSE_ADMIN_USERNAME,
  PARSE_APP_ID,
  PARSE_CLIENT_KEY,
  PARSE_DASHBOARD_APP_NAME,
  PARSE_MASTER_KEY,
  PARSE_SERVER_URL,
  PORTAL_URL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  S3_SECRET_KEY,
  S3_ACCESS_KEY,
  S3_BUCKET,
  TWILIO_ACCOUNT_SID,
  TWILIO_NUMBER,
  TWILIO_AUTH_TOKEN,
  TWILIO_TWIML_APP_SID
} = require('./config');

/**
 * Parse server options
 */

const s3Adapter = new S3Adapter(
  S3_ACCESS_KEY,
  S3_SECRET_KEY,
  S3_BUCKET, {
    region: 'us-east-1',
    directAccess: true,
    globalCacheControl: 'public, max-age=86400' // 24 hrs Cache-Control.
  }
);

const options = {
  loggerAdapter: {
    module: "parse-server/lib/Adapters/Logger/WinstonLoggerAdapter",
    options: {
      logLevel: process.env.DEBUG ? "info" : "error"
    }
  },
  appName: PARSE_DASHBOARD_APP_NAME,
  emailAdapter: sendgrid({
    apiKey: SENDGRID_API_KEY,
    fromAddress: SENDGRID_FROM_EMAIL
  }),
  cloud: `${__dirname}/cloud/`,
  databaseURI: MONGODB_URI,
  appId: PARSE_APP_ID,
  masterKey: PARSE_MASTER_KEY,
  serverURL: PARSE_SERVER_URL,
  clientKey: PARSE_CLIENT_KEY,
  publicServerURL: PARSE_SERVER_URL,
  javascriptKey: PARSE_CLIENT_KEY,
  liveQuery: {
    classNames: ['User', 'Script', 'Question', 'Answer']
  },
  customPages: {
    invalidLink: `${PORTAL_URL}/`,
    verifyEmailSuccess: `${PORTAL_URL}/verified`,
    choosePassword: `${PORTAL_URL}/reset-password`
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
        serverURL: PARSE_SERVER_URL,
        appId: PARSE_APP_ID,
        masterKey: PARSE_MASTER_KEY,
        appName: PARSE_DASHBOARD_APP_NAME,
        javascriptKey: PARSE_CLIENT_KEY,
        clientKey: PARSE_CLIENT_KEY,
        supportedPushLocales: []
      }
    ],
    users: [
      {
        user: PARSE_ADMIN_USERNAME,
        pass: PARSE_ADMIN_PASSWORD
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


const { ClientCapability } = twilio.jwt;
const { VoiceResponse } = twilio.twiml;

// Generate a Twilio Client capability token
app.get('/token', (request, response) => {
  const capability = new ClientCapability({
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
  });

  capability.addScope(new ClientCapability.OutgoingClientScope({ applicationSid: TWILIO_TWIML_APP_SID }));

  const token = capability.toJwt();

  // Include token in a JSON response
  response.send({
    token,
  });
});

app.post('/bot', (request, response) => {
  console.log('request', request.query);
  const confSID = request.query.conferenceSid;
  const callSID = request.query.callSid;
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  client
    .conferences(confSID)
    .participants(callSID)
    .update({ announceUrl: 'http://84e2da52.ngrok.io/conference' })
    .then(data => (data))
    .done();
  // .then(participant => console.log(participant.callSid))
  // .done()
  // .error(err => response.error(err));
  response.sendStatus(200);
});

app.post('/conference', (request, response) => {
  console.log('request in /conf!!!!!!!!!!!!!!', request.body);
  const voiceResponse = new VoiceResponse();
  voiceResponse.say('HOT DIGGITY DOG MY DUDE');
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});


// Create TwiML for outbound calls
app.post('/voice', (request, response) => {
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  client.conferences('Hopscript').participants
    .create({ from: TWILIO_NUMBER, to: '+13236211433' })
    .then((data) => {
      const voiceResponse = new VoiceResponse();
      const dial = voiceResponse.dial();
      dial.conference('Hopscript', { endConferenceOnExit: true });
      if (request.query.callId) {
        Parse.Cloud.run("updateCall", ({ callId: request.query.callId, conferenceSid: data.conferenceSid }))
          .then(() => {
            response.set('Content-Type', 'text/xml');
            response.send(voiceResponse.toString());
          });
      } else {
        response.set('Content-Type', 'text/xml');
        response.send(voiceResponse.toString());
      }
    }).catch(err => console.log('parse err', err));
});


app.get('/joinconference', (request, response) => {
  const voiceResponse = new VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference('Hopscript');
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});


const httpServer = require('http').createServer(app);


httpServer.listen(PORT, () => {
  console.log(`parse server running on ${PORT}`);
});

const parseLiveQuery = ParseServer.createLiveQueryServer(httpServer);
