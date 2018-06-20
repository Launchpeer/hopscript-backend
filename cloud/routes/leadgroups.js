const { fetchUser } = require('../main');
const { fetchLead, reconcileLeadToLeadGroup, removeLeadGroupFromLead } = require('./lead');

/**
 * As an agent I want to create a LeadGroup.
 *
 * We take in a leadGroup object and the user object off of the request object.
 *
 * We run _createNewLeadGroup, giving it the user and the leadgroup's groupName.
 * This creates the leadGroup object, sets the name and the agent, and saves the leadGroup object.
 *
 * We then fetch the user and run _reconcicleLeadGroupToUser, passing it the user and the newly saved group.
 * This sets the leadGroup as a pointer on the User object, and saves the user object.
 *
 * We then take all the leads on the leadGroup request object, and map through them, running
 * _fetchLeadAndReconcileToGroup on each. This goes through each lead and adds them as a pointer
 * on the leadGroup, and adds the leadGroup as a pointer on each lead, and saves both the LeadGroup and the Lead.
 *
 * We then send the success message. Loading and Errors are handled for UX.
 *
 *  @param  {object} leadGroup An object representing the leadGroup, including a name and leads
 *
 */

// creates a new lead group
function _createNewLeadGroup(user, groupName) {
  return new Promise((resolve) => {
    const LGObj = new Parse.Object('LeadGroup');
    LGObj.set('groupName', groupName);
    LGObj.set('agent', user);
    resolve(LGObj.save());
  });
}

// adds lead group to user object
function _reconcileLeadGroupToUser(user, leadGroup) {
  return new Promise((resolve) => {
    user.addUnique('leadGroups', leadGroup);
    resolve(user.save(null, { useMasterKey: true }));
  });
}

// adds leadgroup to lead object
const reconcileLeadGroupToLead = (lead, leadGroup) => new Promise((resolve) => {
  lead.addUnique('leadGroups', leadGroup);
  resolve(lead.save());
});

// reconciles lead to group, and group to lead
function _fetchLeadAndReconcileToGroup(lead, leadGroup) {
  return new Promise((resolve) => {
    fetchLead(lead)
      .then((fetchedLead) => {
        reconcileLeadToLeadGroup(fetchedLead, leadGroup)
          .then(() => {
            reconcileLeadGroupToLead(fetchedLead, leadGroup)
              .then(() => {
                resolve();
              });
          });
      });
  });
}


Parse.Cloud.define('createLeadGroup', (req, res) => {
  const { leadGroup, leadsToAdd } = req.params;
  _createNewLeadGroup(req.user, leadGroup.groupName)
    .then((newlySavedLeadGroup) => {
      fetchUser(req.user.id)
        .then((user) => {
          _reconcileLeadGroupToUser(user, newlySavedLeadGroup)
            .then(() => {
              Promise.all(leadsToAdd.map(lead => _fetchLeadAndReconcileToGroup(lead, newlySavedLeadGroup)))
                .then(() => {
                  res.success('created Lead Group');
                })
                .catch(err => res.error(err));
            })
            .catch(reconcileLeadGroupToUserErr => res.error(reconcileLeadGroupToUserErr));
        })
        .catch(fetchUsererr => res.error(fetchUsererr));
    })
    .catch(createNewLeadGrouperr => res.error(createNewLeadGrouperr));
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

// fetches a lead group, includes lead objects on leadgroup
const fetchLeadGroup = leadGroupId => new Promise((resolve) => {
  const leadGroupQuery = new Parse.Query("LeadGroup");
  leadGroupQuery.include('leads');
  resolve(leadGroupQuery.get(leadGroupId));
});

Parse.Cloud.define('fetchLeadGroup', (req, res) => {
  fetchLeadGroup(req.params.leadGroup)
    .then(leadGroup => res.success(leadGroup))
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

// fetches leadGroups associated with the agent making the query

const fetchLeadGroups = user => new Promise((resolve) => {
  const leadGroupQuery = new Parse.Query("LeadGroup");
  leadGroupQuery.equalTo('agent', user);
  resolve(leadGroupQuery.find(null, { userMasterKey: true }));
});

Parse.Cloud.define('fetchLeadGroups', (req, res) => {
  fetchLeadGroups(req.user)
    .then(groups => res.success(groups))
    .catch(err => res.error(err));
});


/**
 * As an agent I want to update a LeadGroup
 *
 * First we use _fetchLeadGroup to fetch the leadGroup we want to update.
 *
 * Then we run _updateLeadGroup on the lead. This will check to see what is being modified.
 * If it is a lead, we run _reconcileLeadGroupTolead, which adds the leadGroup as a pointer on the lead,
 * and then saves the lead. Then we run _reconcileLeadToleadGroup, which adds the lead as a pointer on
 * the leadGroup and saves the leadGroup.
 *
 * If what is being modified isn't a lead, _updateLeadGroup sets the leadGroup with the updated item.
 *
 * We then send the success message. Loading and Errors are handled for UX.
 *
 * @param  {object} leadGroup An object representing the leadGroup, including an id, name, and leads
 */

// updates the leadGroup
function _updateLeadGroup(leadGroup) {
  return new Promise((resolve) => {
    Object.keys(leadGroup).forEach((key) => {
      if (key === 'lead') {
        reconcileLeadGroupToLead(leadGroup, leadGroup.lead)
          .then(() => reconcileLeadToLeadGroup(leadGroup, leadGroup.lead));
      } else {
        leadGroup.set(key, leadGroup[key]);
      }
    });
    resolve(leadGroup.save());
  });
}


Parse.Cloud.define('updateLeadGroup', (req, res) => {
  fetchLeadGroup(req.params.leadGroup)
    .then((leadGroup) => {
      _updateLeadGroup(leadGroup)
        .then((r) => {
          res.success(r);
        })
        .catch(updateLeadGroupErr => res.error(updateLeadGroupErr));
    })
    .catch(fetchLeadGroupErr => res.error(fetchLeadGroupErr));
});


/**
 * As an agent I want to delete a LeadGroup.
 * We fetch the LeadGroup.
 *
 * We then run _removeLeadGroupFromLeads, querying for the leads the leadGroup
 * is associated with, and removing it from each leads' array of lead pointers
 * and saving the leads.
 *
 * We then delete the leadGroup.
 *
 * We then run _removeLeadGroupFromAgent, removing the leadGroup from the
 *  Agent's array of leadGroup pointers and saving the agent.
 *
 * We then send the success message. Loading and Errors are handled for UX.
 *
 * @param  {object} leadGroup An object representing the leadGroup, including an id, name, and leads
 *
 */

// fetches all the leads associated with a leadGroup
function _fetchLeadsOnLeadGroup(leadGroup) {
  return new Promise((resolve) => {
    const leadQuery = new Parse.Query('Leads');
    leadQuery.equalTo("leadGroups", leadGroup);
    resolve(leadQuery.find());
  });
}

// removes a leadGroup from all leads its associated with
function removeLeadGroupFromLeads(leadGroup) {
  return new Promise((resolve) => {
    _fetchLeadsOnLeadGroup(leadGroup)
      .then((leads) => {
        leads.forEach((lead) => {
          removeLeadGroupFromLead(lead, leadGroup);
        });
      });
    resolve();
  });
}

// removes a lead from an agent
function _removeLeadGroupFromAgent(leadGroup, user) {
  return new Promise((resolve) => {
    user.remove('leadGroups', leadGroup);
    resolve(user.save(null, { useMasterKey: true }));
  });
}

// deletes a lead
function _deleteLeadGroup(leadGroup) {
  return new Promise((resolve) => {
    resolve(leadGroup.destroy());
  });
}


Parse.Cloud.define('deleteLeadGroup', (req, res) => {
  fetchLeadGroup(req.params.leadGroup)
    .then((leadGroup) => {
      if (!leadGroup) { return res.error(`Lead Group with ID ${req.params.leadGroup} does not exist`); }
      removeLeadGroupFromLeads(leadGroup)
        .then(() => {
          _deleteLeadGroup(leadGroup);
        })
        .catch(removeLeadGroupFromLeadErr => res.error(removeLeadGroupFromLeadErr))
        .then(() => {
          _removeLeadGroupFromAgent(leadGroup, req.user);
        })
        .catch(deleteLeadGroupErr => res.error(deleteLeadGroupErr))
        .then((r) => {
          res.success(r);
        })
        .catch(removeLeadGroupFromAgentErr => res.error(removeLeadGroupFromAgentErr));
    });
});

module.exports = {
  fetchLeadGroup,
  fetchLeadGroups,
  reconcileLeadGroupToLead
};
