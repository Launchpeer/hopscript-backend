/**
 * As an agent I want to create a LeadGroup.
 *
 * On Submit of the create leadGroup form, a LeadGroup object is passed to this function as req.params.leadGroup.
 * The object contains a name and leads.
 * We also have access to the user (Agent) off of req.user.
 *
 * First we destructure LeadGroup off of req.params, destructure Agent off of req.user,
 * and establish a new LeadGroup object. We also set up a query for Lead objects.
 *
 * We set the name and the agent for the leadGroup, then we save the leadGroup.
 *
 * Then we query for the user, and add the leadGroup to the User's leadGroups array.
 *
 * Then, we query for each lead in leadGroup.leads. For each,
 * we add the lead as a pointer on the LeadGroup's leads array.
 * We save the leadGroup.
 *
 * Then, we add the leadGroup as a pointer on the Lead's leadGroups array.
 * We save the lead.
 *
 *  Loading and Errors are handled for UX.
 *
 * @param  {object} leadGroup An object representing the leadGroup, including a name and leads
 *
 */

Parse.Cloud.define('createLeadGroup', (req, res) => {
  const { leadGroup, leadsToAdd } = req.params;
  const Agent = req.user;
  const LGObj = new Parse.Object('LeadGroup');
  const leadQuery = new Parse.Query("Lead");
  LGObj.set('groupName', leadGroup.groupName);
  LGObj.set('agent', Agent);
  LGObj.save()
    .then((newlySavedLeadGroup) => {
      const userQuery = new Parse.Query('User');
      userQuery.get(req.user.id, { useMasterKey: true })
        .then((user) => {
          user.addUnique('leadGroups', newlySavedLeadGroup);
          user.save(null, { useMasterKey: true })
            .then(() => {
              leadsToAdd.forEach((lead) => {
                leadQuery.get(lead)
                  .then((fetchedLead) => {
                    newlySavedLeadGroup.addUnique('leads', fetchedLead);
                    fetchedLead.set('leadGroups', newlySavedLeadGroup);
                    fetchedLead.save();
                  });
              });
            });
        })
        .then(() => {
          newlySavedLeadGroup.save();
        })
        .then(r => res.succes(r));
    })
    .catch(err => res.error(err));
});

/**
 * As an agent I want to fetch a LeadGroup
 *
 * We query the database for LeadGroup
 * If found, we return the LeadGroup & its associated leads.
 *
 * @param  {object} leadGroup An object representing the leadGroup, including an id, name, and Leads
 *
 */

Parse.Cloud.define('fetchLeadGroup', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.include('leads');
  leadGroupQuery.get(req.params.leadGroup)
    .then(lg => res.success(lg))
    .catch(err => res.error(err));
});


/**
 * As an agent I want to fetch my LeadGroups
 * We query the database for LeadGroups, checking to see if the leadGroups's Agent
 * is equal to the user making the query.
 * If found, we return the LeadGroups.
 *
 *@param  {object} user An object representing the user, including their leadGroups.
 *
 */

Parse.Cloud.define('fetchLeadGroups', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.equalTo("agent", req.user);
  leadGroupQuery.find()
    .then((groups) => { res.success(groups); })
    .catch(err => res.error(err));
});


/**
 * As an agent I want to update a LeadGroup
 *
 * We query the database for LeadGroup, using the LeadGroup's id.
 *
 * If found, we check to see what is being updated, and set that update.
 *
 * If the update is to add a Lead to the LeadGroup, we query for the
 * Lead and use addUnique to add the Lead to the array of pointers on the
 * LeadGroup.  We add the LeadGroup to the array of pointers on the Lead.
 * We save the LeadGroup.
 *
 * Then we save the Lead.
 *
 * @param  {object} leadGroup An object representing the leadGroup, including an id, name, and leads
 */

Parse.Cloud.define('updateLeadGroup', (req, res) => {
  const leadGroupQuery = new Parse.Query('LeadGroup');
  leadGroupQuery.get(req.params.leadGroup)
    .then((leadGroup) => {
      Object.keys(req.params).forEach((key) => {
        if (key === 'lead') {
          const leadQuery = new Parse.Query('Lead');
          leadQuery.get(req.params.lead)
            .then((lead) => {
              lead.addUnique("leadGroups", leadGroup);
              leadGroup.addUnique("leads", lead);
              lead.save();
            });
        } else {
          leadGroup.set(key, req.params[key]);
        }
      });
      leadGroup.save()
        .then((r) => {
          res.success(r);
        });
    })
    .catch(err => res.error(err));
});


/**
 * As an agent I want to delete a LeadGroup
 * We query the database for LeadGroups.
 *
 * If found, we query for leads who have that leadGroup in their array of leadGroups.
 * We then remove the LeadGroup from each Lead it is associated with.
 * We save the Lead.
 *
 * Then we remove the leadGroup from the database.
 *
 * Then we remove the leadGroup from the Agent's array of leadGroups.
 * Then we save the Agent.
 * We then query for the newly saved Agent and send it back with the success response.
 *
 *
 * @param  {object} leadGroup An object representing the leadGroup, including an id, name, and leads
 *
 */

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
