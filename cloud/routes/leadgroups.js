/**
 * As an agent I want to fetch LeadGroups
 * We query the database for LeadGroups
 * If found, we return the LeadGroups
 *
 */

Parse.Cloud.define('fetchLeadGroups', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.equalTo("agent", req.user);
  leadGroupQuery.find()
    .then((groups) => { res.success(groups); })
    .catch(err => res.error(err));
});


Parse.Cloud.define('deleteLeadGroup', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.get(req.params.leadGroup)
    .then((leadGroup) => {
      if (!leadGroup) { return res.error(`Lead Group with ID ${req.params.leadGroup} does not exist`); }
      const leadQuery = new Parse.Query('Lead');
      leadQuery.equalTo("leadGroups", leadGroup);
      leadQuery.find()
        .then((leads) => {
          leads.forEach((lead) => {
            lead.remove("leadGroups", leadGroup);
            lead.save();
          });
        })
        .then(() => {
          leadGroup.destroy();
        })
        .then(() => {
          const agent = req.user;
          agent.remove("leadGroups", leadGroup);
          agent.save(null, { useMasterKey: true });
        })
        .then(() => {
          const userQuery = new Parse.Query(Parse.User);
          userQuery.include('agents');
          userQuery.include('leads');
          userQuery.include('leadGroups');
          userQuery.find('objectId', req.user.id)
            .then((r) => {
              res.success(r);
            });
        });
    })
    .catch(err => res.error(err));
});
