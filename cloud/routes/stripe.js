const config = require('../../config');
const request = require('request');
const StripeInterface = require('mc-stripe-server');
const stripe = require('stripe')(config.STRIPE_API_KEY);

function _fetchUser(userId) {
  return new Promise((resolve) => {
    const User = Parse.Object.extend('User');
    const query = new Parse.Query(User);
    resolve(query.get(userId, { useMasterKey: true }));
  });
}

Parse.Cloud.define('getStripeConnectId', (req, res) => {
  request.post({
    url: 'https://connect.stripe.com/oauth/token',
    form: {
      grant_type: 'authorization_code',
      code: req.params.code,
      client_secret: config.STRIPE_API_KEY
    }
  }, (err, response, body) => {
    const stripeUserId = JSON.parse(response.body)
    const stripeId = stripeUserId.stripe_user_id
    if (err) {
      console.log('STRIPE ERR', err);
      res.error(err);
    } else {
      _fetchUser(req.params.userId)
        .then(user => {
          user.set('stripe_connect_id', stripeId);
          user.save(null, {useMasterKey: true})
            .then((updatedUser) => {
              console.log('updated', updatedUser);
              res.success(updatedUser);
            })
        })
    }
  });
});

Parse.Cloud.define('createStripeCustomer', function ( req, res ) {
    let strI = new StripeInterface(config.STRIPE_API_KEY);
    let user = req.user
    strI.createCustomer(req.user.id, req.params.token)
    .then(customer => {
        user.set("stripe_customer_id", customer.id);
        user.set("last4", customer.sources.data[0].last4)
        user.save(null, {useMasterKey: true})
        .then(user => {
            res.success({customer: customer, user: user});
        });
    })
    .catch(err => {
        res.error(err);
    });
});

Parse.Cloud.define('updateStripeCustomer', (req, res) => {
    let strI = new StripeInterface(config.STRIPE_API_KEY);
    let user = req.user;
    if(!user.get('stripe_customer_id')) {
        return res.error('User does not have a credit card on file to update.');
    }
    if(!req.params.token) {
        return res.error('User must submit a stripe credit card token in order to update their current payment profile.');
    }
    strI.findCustomer(user.get('stripe_customer_id'))
    .then(customer => {
        if(!customer.sources.data[0]) {
            // skip over and return to next step
            return null;
        } else {
            let card = customer.sources.data[0];
            return strI.deleteCustomerCard(card.id, customer.id);
        }

    })
    .then(result => {
        return strI.createCustomerCard(user.get("stripe_customer_id"), req.params.token);
    })
    .then(card => {
        user.set('last4', card.last4);
        user.save(null, {useMasterKey: true});
        return res.success(card);
    })
    .catch(err => {
        return res.error(err);
    });
});
