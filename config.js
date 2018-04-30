module.exports = {
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/parse-example',
  PARSE_APP_ID: process.env.PARSE_APP_ID || 'your_app_id',
  PARSE_MASTER_KEY:
    process.env.PARSE_MASTER_KEY || '?Ag4M)ZA*BBpIGL!XIqCe6acB&rcmL',
  PARSE_SERVER_URL:
    process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse',
  PARSE_ADMIN_USERNAME: process.env.PARSE_ADMIN_DASHBOARD_USERNAME || 'admin',
  PARSE_ADMIN_PASSWORD:
    process.env.PARSE_ADMIN_DASHBOARD_PASSWORD || 'password',
  PARSE_DASHBOARD_APP_NAME:
    process.env.PARSE_DASHBOARD_APP_NAME || 'yourappname',
  PARSE_SERVER_MOUNT: process.env.PARSE_SERVER_MOUNT || '/parse',
  PARSE_CLIENT_KEY: process.env.PARSE_CLIENT_KEY || 'client_key',
  GCM_SENDER_ID: process.env.GCM_SENDER_ID || 'sender_id',
  GCM_API_KEY: process.env.GCM_API_KEY || 'gcm_api_key',
  APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID || 'com.lp.example.app',
  APNS_PASSPHRASE: process.env.APNS_PASSPHRASE || 'password',
  APNS_PUSH_PRODUCTION: process.env.APNS_PUSH_PRODUCTION || false,
  SENDGRID_API_KEY:
    process.env.SENDGRID_API_KEY ||
    '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',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL
}
