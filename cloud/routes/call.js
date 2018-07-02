const { _fetchLead } = require('./lead');
const { _fetchScript } = require('./scripts');


function _createNewCall(user, title, script, lead, leadGroup) {
  return new Promise((resolve) => {
    const CObj = new Parse.Object('Call');
    CObj.set('agent', user);
    CObj.set('title', title);
    CObj.set('script', script);
    CObj.set('startTime', new Date().getTime());
    if (lead) { CObj.set('lead', lead); }
    if (leadGroup) { CObj.set('leadGroup', leadGroup); }
    resolve(CObj.save());
  });
}

function _fetchCall(callId) {
  return new Promise((resolve) => {
    const Call = Parse.Object.extend('Call');
    const query = new Parse.Query(Call);
    query.include('script');
    query.include('script.questions');
    query.include('script.questions.answers');
    query.include('lead');
    resolve(query.get(callId));
  });
}


Parse.Cloud.define('createCall', (req, res) => {
  const { lead, script, title } = req.params.call;
  Promise.all([
    _fetchScript(script),
    _fetchLead(lead),
  ])
    .then((d) => {
      _createNewCall(req.user, title, d[0], d[1])
        .then((createdCall) => {
          res.success(createdCall);
        })
        .catch(createNewCallErr => res.error('CREATE NEW CALL ERR: ', createNewCallErr));
    })
    .catch((err) => {
      console.log('promise err', err);
    });
});

Parse.Cloud.define('fetchCall', (req, res) => {
  const { callId } = req.params;
  _fetchCall(callId)
    .then((d) => {
      res.success(d);
    })
    .catch(fetchCallErr => res.error('FETCH CALL ERR', fetchCallErr));
});

// updates the call object
function _updateCall(call, data) {
  return new Promise((resolve) => {
    Object.keys(data).forEach((key) => {
      call.set(key, data[key]);
    });
    resolve(call.save());
  });
}


Parse.Cloud.define('updateCall', (req, res) => {
  _fetchCall(req.params.callId)
    .then((call) => {
      _updateCall(call, req.params)
        .then((r) => {
          res.success(r);
        })
        .catch(updateCallErr => res.error(updateCallErr));
    })
    .catch(fetchCallErr => res.error(fetchCallErr));
});
