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
      if (req.params.name) {
        lead.set('name', req.params.name);
      }
      if (req.params.phone) {
        lead.set('phone', req.params.phone);
      }
      if (req.params.email) {
        lead.set('email', req.params.email);
      }
      if (req.params.leadType) {
        lead.set('leadType', req.params.leadType);
      }
      if (req.params.leadGroup) {
        const groupQuery = new Parse.Query('LeadGroup');
        groupQuery.get(req.params.leadGroup)
          .then((leadGroup) => {
            lead.addUnique("leadGroups", leadGroup);
            leadGroup.addUnique("leads", lead);
            leadGroup.save();
          });
      }
      lead.save()
        .then(r => res.success(r));
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
