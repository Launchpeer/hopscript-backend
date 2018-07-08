module.exports = {
  stripe: require('./routes/stripe'),
  agents: require('./routes/agents'),
  scripts: require('./routes/scripts'),
  lead: require('./routes/lead'),
  leadgroups: require('./routes/leadgroups'),
  main: require('./main'),
  call: require('./routes/call')
};
