const StripeInterface = require('mc-stripe-server');
const config = require('../../config');
const request = require('request');
const fetch = require("node-fetch");

const { STRIPE_API_KEY } = config;
const Stripe = require('stripe')(STRIPE_API_KEY);

Parse.Cloud.define('getStripeConnectId', (req, res) => {
  request.post({
    url: 'https://connect.stripe.com/oauth/token',
    form: {
      grant_type: 'authorization_code',
      code: req.params.code,
      client_secret: config.STRIPE_API_KEY
    }
  }, (err, response, body) => {
    if (err) {
      res.error(err);
    } else {
      res.success(body);
    }
  });
});

Parse.Cloud.define('getBalanceHistory', (req, res) => {
  Stripe.charges.list({ stripe_account: req.params.stripe_connect_id }, (err, transactions) => {
  // asynchronously called returning an array at transactions.data
    const sum = iterable => iterable.data.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);
    let total = sum(transactions);
    total = (total - (total % 100)) / 100;
    res.success({ transactions, total });
  });
});

function _getStripeToken({
  number,
  expMonth,
  expYear,
  cvc
}) {
  return new Promise((resolve) => {
    fetch(
      `https://api.stripe.com/v1/tokens?card[number]=${number}&card[exp_month]=${expMonth}&card[exp_year]=${expYear}&card[cvc]=${cvc}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${STRIPE_API_KEY}`
        }
      }
    )
      .then((r) => {
        r.json()
          .then(c => resolve(c.id));
      });
  });
}

Parse.Cloud.define('createStripeCustomer', (req, res) => {
  const strI = new StripeInterface(STRIPE_API_KEY);
  const { user } = req;
  _getStripeToken(req.params)
    .then((token) => {
      strI.createCustomer(req.user.id, token)
        .then((customer) => {
          user.set("stripe_customer_id", customer.id);
          user.set("last4", customer.sources.data[0].last4);
          user.save(null, { useMasterKey: true })
            .then((updatedUser) => {
              res.success(updatedUser);
            });
        })
        .catch((err) => {
          res.error(err);
        });
    });
});

Parse.Cloud.define('updateStripeCustomer', (req, res) => {
  const strI = new StripeInterface(STRIPE_API_KEY);
  const { user } = req;
  if (!user.get('stripe_customer_id')) {
    return res.error('User does not have a credit card on file to update.');
  }
  if (!req.params.token) {
    return res.error('User must submit a stripe credit card token in order to update their current payment profile.');
  }
  strI.findCustomer(user.get('stripe_customer_id'))
    .then((customer) => {
      if (!customer.sources.data[0]) {
        // skip over and return to next step
        return null;
      }
      const card = customer.sources.data[0];
      return strI.deleteCustomerCard(card.id, customer.id);
    })
    .then(() => strI.createCustomerCard(user.get("stripe_customer_id"), req.params.token))
    .then((card) => {
      user.set('last4', card.last4);
      user.save(null, { useMasterKey: true })
        .then((updatedUser) => {
          res.success(updatedUser);
        });
    })
    .catch(err => res.error(err));
});
