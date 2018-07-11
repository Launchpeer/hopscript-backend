/**
 * As an agent I want to fetch my Call History
 * We query the database for Calls, checking to see if the Call's Agent
 * is equal to the user making the query.
 * If found, we return the Calls.
 *
 *@param  {object} user An object representing the user, including their Calls.
 *
 */

// fetches Calls associated with the agent making the query

const fetchHistory = user => new Promise((resolve) => {
  const historyQuery = new Parse.Query("Call");
  historyQuery.equalTo('agent', user);
  historyQuery.include('lead');
  historyQuery.descending('endTime');
  resolve(historyQuery.find(null, { userMasterKey: true }));
});

Parse.Cloud.define('fetchHistory', (req, res) => {
  fetchHistory(req.user)
    .then((calls) => {
      res.success(calls);
    })
    .catch(err => res.error(err));
});

const fetchLead = lead => new Promise((resolve) => {
  const leadQuery = new Parse.Query('Lead');
  resolve(leadQuery.get(lead));
});

const fetchCalls = lead => new Promise((resolve) => {
  const callQuery = new Parse.Query('Call');
  callQuery.equalTo('lead', lead);
  callQuery.descending('endTime');
  resolve(callQuery.find(null, { userMasterKey: true }));
});

const setLastCall = (lead, call) => new Promise((resolve) => {
  lead.set('lastContact', call.attributes.endTime);
  lead.set('lastCallNotes', call.attributes.notes);
  lead.set('lastCallTitle', call.attributes.title);
  resolve(lead.save());
});


Parse.Cloud.define('fetchLastLeadCall', (req, res) => {
  fetchLead(req.params.lead).then((lead) => {
    fetchCalls(lead).then((calls) => {
      setLastCall(lead, calls[0]);
      res.success();
    }).catch(err => res.error(err));
  }).catch(err => res.error(err));
});
