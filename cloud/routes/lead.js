/**
 * As an agent I want to create a Lead

 *
 */

Parse.Cloud.define('createLead', (req, res) => {
  const { lead } = req.params;
  const Agent = req.user;
  const LObj = new Parse.Object('Lead');
  const formattedPhone = `+1${lead.phone}`;
  // Get the leadGroup pointer object from Parse
  const leadGroupQuery = new Parse.Query("LeadGroup");
  leadGroupQuery.get(lead.leadGroup)
    .then((leadGroup) => {
      LObj.set('name', lead.name);
      LObj.set('phone', formattedPhone);
      LObj.set('email', lead.email);
      LObj.set('leadType', lead.leadType);
      LObj.addUnique('leadGroups', leadGroup);
      LObj.set('agent', Agent);
      LObj.save()
        .then((newlySavedLead) => {
          console.log("newlySavedLead", newlySavedLead.attributes);
          leadGroup.addUnique("leads", newlySavedLead);
          leadGroup.save()
            .then(() => {
              const userQuery = new Parse.Query('User');
              userQuery.get(req.user.id, { useMasterKey: true })
                .then((user) => {
                  user.addUnique('leads', newlySavedLead);
                  user.save(null, { useMasterKey: true })
                    .then(r => res.success(r));
                });
            });
        });
    })

    .catch(err => res.error(err));
});


/**
 * As an agent I want to update a Lead
 *
 * We query the database for Leads, using the Lead's id
 * If found, we check to see what is being updated, and set that update
 * If the update is to add the Lead to a LeadGroup, we query for the
 * LeadGroup, and use addUnique to add the Lead to the array of pointers on the
 * LeadGroup, and add the LeadGroup to the array of pointers on the Lead.
 * Then we save the Lead.
 *
 */

Parse.Cloud.define('updateLead', (req, res) => {
  const leadQuery = new Parse.Query('Lead');
  leadQuery.get(req.params.lead)
    .then((lead) => {
      Object.keys(req.params).forEach((key) => {
        if (key === 'leadGroup') {
          const groupQuery = new Parse.Query('LeadGroup');
          groupQuery.get(req.params.leadGroup)
            .then((leadGroup) => {
              lead.addUnique("leadGroups", leadGroup);
              leadGroup.addUnique("leads", lead);
              leadGroup.save();
            });
        } else {
          lead.set(key, req.params[key]);
        }
      });
      lead.save()
        .then((r) => {
          res.success(r);
        });
    })
    .catch(err => res.error(err));
});

/**
 * As an agent I want to remove a LeadGroup from a Lead
 *
 * We query the database for Leads, using the Lead's id
 * If found, we query for the LeadGroup, and use remove
 * to remove the Lead to the array of pointers on the
 * LeadGroup, and remoe the LeadGroup to the array of pointers on the Lead.
 * Then we save the LeadGroup.
 * Then we save the Lead.
 *
 */

Parse.Cloud.define('removeGroupFromLead', (req, res) => {
  const leadQuery = new Parse.Query('Lead');
  leadQuery.get(req.params.lead)
    .then((lead) => {
      const groupQuery = new Parse.Query('LeadGroup');
      groupQuery.get(req.params.leadGroup)
        .then((leadGroup) => {
          leadGroup.remove("leads", lead);
          lead.remove("leadGroups", leadGroup);
          leadGroup.save();
          lead.save()
            .then(r => res.success(r));
        });
    })
    .catch(err => res.error(err));
});

/**
 * As an agent I want to fetch a Lead
 * We query the database for Lead
 * If found, we return the Lead & its associated leadGroups.
 *
 */

Parse.Cloud.define('fetchLead', (req, res) => {
  const leadQuery = new Parse.Query('Lead');
  leadQuery.include('leadGroups');
  leadQuery.get(req.params.lead)
    .then(lead => res.success(lead))
    .catch(err => res.error(err));
});

/**
 * As an agent I want to fetch my Leads
 * We query the database for Leads
 * If found, we return the Leads
 *
 */
Parse.Cloud.define('fetchLeads', (req, res) => {
  const leadsQuery = new Parse.Query('Lead');
  leadsQuery.equalTo('agent', req.user);
  leadsQuery.find()
    .then(leads => res.success(leads))
    .catch(err => res.error(err));
});


/**
 * As an agent I want to delete a Lead
 * We query the database for Lead
 * If found, we delete the Lead.
 *
 */

Parse.Cloud.define('deleteLead', (req, res) => {
  const leadQuery = new Parse.Query('Lead');
  leadQuery.get(req.params.lead)
    .then((lead) => {
      if (!lead) { return res.error(`Lead with ID ${req.params.lead} does not exist`); }
      const leadGroupQuery = new Parse.Query('LeadGroup');
      leadGroupQuery.equalTo("leads", lead);
      leadGroupQuery.find()
        .then((groups) => {
          groups.forEach((leadGroup) => {
            leadGroup.remove("leads", lead);
            leadGroup.save();
          });
        })
        .then(() => {
          lead.destroy();
        })
        .then(() => {
          const agent = req.user;
          agent.remove("leads", lead);
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
