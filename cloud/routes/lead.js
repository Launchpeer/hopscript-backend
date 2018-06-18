/**
 * As an agent I want to create a Lead.
 *
 * On Submit of the create lead form, a Lead object is passed to this function as req.params.lead.
 * The object contains a name, phone, email, leadType, and leadGroup.
 * We also have access to the user (Agent) off of req.user.
 *
 * First we destructure Lead off of req.params, destructure Agent off of req.user,
 * establish a new Lead object, and set up formatting for the phone number to work with Twilio's API.
 *
 * Then, we query for the LeadGroup that the lead has been assigned to (lead.leadGroup is the leadgroup's ID).
 * Once we have the leadgroup, we start setting items on the Lead object. We have to use "addUnique"
 * on the leadGroup so that it is passed in as one pointer in what will be an array of pointers.
 * We save the Lead object.
 *
 * Then, we take the newly saved lead, and add it as a pointer in an array of pointers on the LeadGroup.
 * We save the LeadGroup.
 *
 * Then, we query for the user making the request using req.user.id, using useMasterKey.
 * We add the newly saved lead as a pointer in an array of pointers on the User.
 * We save the user, using useMasterKey.
 *
 *  Loading and Errors are handled for UX.
 *
 * @param  {object} lead An object representing the lead, including a name, phone, email, leadType, and leadGroup
 *
 */

function _fetchLeadGroup(leadGroup) {
  return new Promise((resolve) => {
    const leadGroupQuery = new Parse.Query("LeadGroup");
    resolve(leadGroupQuery.get(leadGroup));
  });
}

function _createNewLead(user, lead, leadGroup) {
  return new Promise((resolve) => {
    const Agent = user;
    const LObj = new Parse.Object('Lead');
    const formattedPhone = `+1${lead.phone}`;
    LObj.set('name', lead.name);
    LObj.set('phone', formattedPhone);
    LObj.set('email', lead.email);
    LObj.set('leadType', lead.leadType);
    LObj.addUnique('leadGroups', leadGroup);
    LObj.set('agent', Agent);
    resolve(LObj.save());
  });
}

const _reconcileLeadToLeadGroup = (lead, leadGroup) => new Promise((resolve) => {
  leadGroup.addUnique("leads", lead);
  resolve(leadGroup.save());
});

function _fetchUser(id) {
  return new Promise((resolve) => {
    const userQuery = new Parse.Query('User');
    resolve(userQuery.get(id, { useMasterKey: true }));
  });
}

function _reconcileLeadToUser(user, lead) {
  return new Promise((resolve) => {
    user.addUnique('leads', lead);
    resolve(user.save(null, { useMasterKey: true }));
  });
}

Parse.Cloud.define('createLead', (req, res) => {
  const { lead } = req.params;
  _fetchLeadGroup(lead.leadGroup)
    .then((leadGroup) => {
      _createNewLead(req.user, lead, leadGroup)
        .then((newlySavedLead) => {
          _reconcileLeadToLeadGroup(newlySavedLead, leadGroup)
            .then(() => {
              _fetchUser(req.user.id)
                .then((user) => {
                  _reconcileLeadToUser(user, newlySavedLead)
                    .then(r => res.success(r))
                    .catch((reconcileLeadToUserErr) => {
                      res.error(reconcileLeadToUserErr);
                    });
                })
                .catch((fetchUserErr) => {
                  res.error(fetchUserErr);
                });
            })
            .catch((reconcileLeadToLeadGroupErr) => {
              res.error(reconcileLeadToLeadGroupErr);
            });
        })
        .catch((createNewLeadErr) => {
          res.error(createNewLeadErr);
        });
    })
    .catch((fetchLeadGroupErr) => {
      res.error(fetchLeadGroupErr);
    });
});


/**
 * As an agent I want to fetch a Lead
 *
 * We query the database for Lead
 * If found, we return the Lead & its associated leadGroups.
 *
 * @param  {object} lead An object representing the lead, including an id, name, phone, email, leadType, and leadGroup
 *
 */

const _fetchLead = leadId => new Promise((resolve) => {
  const leadQuery = new Parse.Query('Lead');
  leadQuery.include('leadGroups');
  resolve(leadQuery.get(leadId));
});

Parse.Cloud.define('fetchLead', (req, res) => {
  _fetchLead(req.params.lead)
    .then(lead => res.success(lead))
    .catch(err => res.error(err));
});

/**
 * As an agent I want to fetch my Leads
 * We query the database for Leads, checking to see if the lead's Agent is equal to the user making the query.
 * If found, we return the Leads.
 *
 *@param  {object} user An object representing the user, including their leads
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
 * As an agent I want to update a Lead
 *
 * We query the database for Leads, using the Lead's id.
 *
 * If found, we check to see what is being updated, and set that update.
 *
 * If the update is to add the Lead to a LeadGroup, we query for the
 * LeadGroup, and use addUnique to add the Lead to the array of pointers on the
 * LeadGroup.  We add the LeadGroup to the array of pointers on the Lead.
 * We save the LeadGroup.
 *
 * Then we save the Lead.
 *
 * @param  {object} lead An object representing the lead, including an id, name, phone, email, leadType, and leadGroup
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
 * We query the database for Leads, using the Lead's id.
 * If found, we query for the LeadGroup, and use remove
 * to remove the Lead to the array of pointers on the
 * LeadGroup, and remove the LeadGroup to the array of pointers on the Lead.
 * Then we save the LeadGroup.
 * Then we save the Lead.
 *
 * @param  {object} lead An object representing the lead, including an id, name, phone, email, leadType, and leadGroup
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
 * As an agent I want to delete a Lead.
 * We query the database for Lead.
 *
 * If found, we query for leadGroups who have that lead in their array of leads.
 * We then remove the Lead from each LeadGroup it is associated with.
 * We save the LeadGroup.
 *
 * Then we remove the lead from the database.
 *
 * Then we remove the lead from the Agent's array of leads.
 * Then we save the Agent.
 * We then query for the newly saved Agent and send it back with the success response.
 *
 *
 * @param  {object} lead An object representing the lead, including an id, name, phone, email, leadType, and leadGroup
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

export { _fetchLead, _reconcileLeadToLeadGroup };
