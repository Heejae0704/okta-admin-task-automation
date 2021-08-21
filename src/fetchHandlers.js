const fetch = require("node-fetch");
const { DateTime } = require("luxon");
const colors = require("colors/safe");

const baseurl = process.env.BASE_URL;
const API_TOKEN = process.env.OKTA_API_TOKEN;
const headers = {
  "Content-Type": "application/json",
  Authorization: `SSWS ${API_TOKEN}`,
};

// This is a relatively inexpensive call to update the API token expiration date
async function fetchDailyCall() {
  const res = await fetch(baseurl + "/api/v1/domains", {
    method: "get",
    headers,
  });

  //   const json = await res.json();
  //   console.log(json);
}

async function fetchGroupMembershipRemoval(data) {
  const res = await fetch(
    `${baseurl}/api/v1/groups/${data.groupId}/users/${data.userId}`,
    {
      method: "delete",
      headers,
    }
  );

  await checkLimitAndDelay(res);
  console.log(
    DateTime.now().toString() +
      colors.blue(
        ": Membership for " +
          colors.bgBlack.white(`${data.userName}`) +
          " on the group " +
          colors.bgBlack.white(`${data.groupName}`) +
          " is successfully removed and the log is stored in " +
          colors.bgBlack.white(
            `membershipRemoved-${DateTime.now().toFormat("yyyy-MM-dd")}.csv`
          ) +
          " file."
      )
  );
}

module.exports = {
  fetchDailyCall,
  fetchGroupMembershipRemoval,
};

// helper function to delay 1 sec when the API rate limit is reached
async function checkLimitAndDelay(res) {
  if (Number(res.headers.get("x-rate-limit-remaining")) < 5) {
    const limitResetTime = DateTime.fromMillis(
      res.headers.get("x-rate-limit-reset")
    );
    while (!timeUp) {
      await delay(1000);
      const now = DateTime.now();
      if (limitResetTime < now) timeUp = true;
    }
  } else {
    return;
  }
}

async function delay(millisecond) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve("");
    }, millisecond)
  );
}
