# Running Locally

Create a `.env` file with the variables required in `config.js`
_NOTE: Never commit the .env file!_

When running locally, your `PARSE_SERVER_URL` will be http://localhost:1337/parse

To Run:

```
> npm install
> npm run start
```


# Cloud Code

## inviteAgent
`cloud/routes/agents`

*As a broker I want to create an agent and invite them to login.*

A `User` with the role `agent` is created in the database. That agent is added to the brokerage's `agents` array as a `Pointer`.
The agent is given a generated password and sent an invitation email with log in instructions.

##removeAgent
`cloud/routes/agents`

*As a broker I want to delete an agent and dissociate them from my Brokerage*

A `User` with the role `agent` is deleted from the database. The `agent` Pointer is then removed from the brokerage's `agents` array.
