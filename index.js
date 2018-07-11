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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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
  const { conferenceSid, audioUrl } = request.body;
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  client
    .conferences(conferenceSid)
    .update({ announceMethod: 'GET', announceUrl: `http://b373628f.ngrok.io/conference?audio=${audioUrl}` })
    .then(data => (data))
    .done();
  response.sendStatus(200);
});


app.post('/stop', (request, response) => {
  const confSID = request.body.conferenceSid;
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  client
    .conferences(confSID)
    .update({ announceUrl: `https://swiftscript-backend-qa.herokuapp.com/conference?audio=${audioUrl}` })
    .then(data => (data))
    .done();
  response.sendStatus(200);
});

app.get('/conference', (request, response) => {
  const voiceResponse = new VoiceResponse();
  voiceResponse.play(request.query.audio);
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});

app.post('/stopaudio', (request, response) => {
  const voiceResponse = new VoiceResponse();
  voiceResponse.say(' ');
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});

// Create TwiML for outbound calls
app.post('/start-call', (request, response) => {
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  if (request.body.number) {
    client.conferences('Hopscript').participants
      .create({ from: TWILIO_NUMBER, to: request.body.number })
      .then((data) => {
        if (request.body.callId) {
          Parse.Cloud.run("updateCall", ({ callId: request.body.callId, conferenceSid: data.conferenceSid }))
            .then(() => {
              response.sendStatus(200);
            });
        } else {
          response.sendStatus(200);
        }
      }).catch(err => console.log('CREATE CONFERENCE ERR', err));
  }
});

// Create TwiML for outbound calls
app.post('/voice', (request, response) => {
  const voiceResponse = new VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference('Hopscript', { endConferenceOnExit: true });
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});


app.post('/joinconference', (request, response) => {
  const voiceResponse = new VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference('Hopscript', { endConferenceOnExit: true });
  response.set('Content-Type', 'text/xml');
  response.send(voiceResponse.toString());
});

const httpServer = require('http').createServer(app);

httpServer.listen(PORT, () => {
  console.log(`parse server running on ${PORT}`);
});

const parseLiveQuery = ParseServer.createLiveQueryServer(httpServer);
