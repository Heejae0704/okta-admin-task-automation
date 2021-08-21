const express = require("express");
const helmet = require("helmet");
const basicAuth = require("express-basic-auth");
const colors = require("colors/safe");
require("dotenv").config();

// Okta Hook handlers
const updateMembersExpireOn = require("./src/updateMembersExpireOn");

// cronjob tasks
const { dailyCron } = require("./src/cronTask");
dailyCron.start();
console.log("removeExpiredUsersFromGroup cronjob started");

// Express server to receive Okta Event Hook
const PORT = process.env.PORT || 3000;
const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  basicAuth({
    users: { admin: process.env.SECRET },
    unauthorizedResponse: (req) => "Unauthorized",
  })
);

// To handle initial verification
app.get("/oktaEvents", (request, response) => {
  var returnValue = {
    verification: request.headers["x-okta-verification-challenge"],
  };
  response.json(returnValue);
});

app.post("/oktaEvents", async (request, response) => {
  const event = request.body.data.events[0];
  const eventType = event.eventType;
  try {
    switch (eventType) {
      case "group.user_membership.add":
        await updateMembersExpireOn(event);
        break;
      case "something_else_to_be_added_later":
        // do something else when the other event is triggered...
        break;
      default:
        console.log(
          colors.bgBlack.red(
            `eventType: There is no action set for ${eventType}. Check the switch statement in main.js!`
          )
        );
    }
    response.sendStatus(200);
  } catch (err) {
    response.sendStatus(500);
    console.log("Something went wrong!: " + err);
  }
});

app.listen(PORT, () => {
  console.log(`Okta Event Hook Receiver running at PORT:${PORT}`);
  console.log(
    `If you are on local testing environment, make sure you also run ngnok by: ./ngnok http ${PORT}`
  );
});
