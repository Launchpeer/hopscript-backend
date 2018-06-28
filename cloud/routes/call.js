const { _fetchLead } = require('./lead');
const { _fetchScript } = require('./scripts');


function _createNewCall(user, title, script, lead, leadGroup) {
  return new Promise((resolve) => {
    const CObj = new Parse.Object('Call');
    CObj.set('agent', user);
    CObj.set('title', title);
    CObj.set('script', script);
    CObj.set('startTime', new Date().getTime())
    if (lead) { CObj.set('lead', lead)}
    if (leadGroup) { CObj.set('leadGroup', leadGroup)}
    resolve(CObj.save());
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
          console.log('createdCall', createdCall)
        })
        .catch((createNewCallErr) => console.log('CREATE NEW CALL ERR: ', createNewCallErr))
    })
    .catch((err) => {
      console.log('promise err', err);
    })
});
