/**
 * As an agent I want to fetch LeadGroups
 * We query the database for LeadGroups
 * If found, we return the LeadGroups
 *
 */

Parse.Cloud.define('fetchLeadGroups', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.find()
    .then(lead => res.success(lead))
    .catch(err => res.error(err));
});
