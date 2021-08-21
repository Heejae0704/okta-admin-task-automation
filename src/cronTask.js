const cron = require("node-cron");
const { DateTime } = require("luxon");
const {
  getDataFromFile,
  writeDataToFile,
  getNormalizedPath,
} = require("./csvReadWrite");

const {
  fetchDailyCall,
  fetchGroupMembershipRemoval,
} = require("./fetchHandlers");

const dailyCron = cron.schedule("0,30 * * * * *", () => {
  try {
    console.log(DateTime.now().toString() + ": Daily cronjob initiated");
    removeExpiredUsersFromGroup();
  } catch (err) {
    console.log(err);
  }
});

// The task we want the cronjob to perform
async function removeExpiredUsersFromGroup() {
  // read the membersExpireOn file
  const membersDataWithShape = await getDataFromFile(
    getNormalizedPath("data", "membersExpireOn.csv")
  );
  const membersData = membersDataWithShape.data;

  // if there is no members at all in original data, skip the process
  // to prevent API token to be expired, we will causally call some inexpensive endpoint
  if (membersData.length === 0) {
    await fetchDailyCall();
    return;
  }

  // if there is no member whose group membership is expired, skip the process
  // to prevent API token to be expired, we will causally call some inexpensive endpoint
  const expiredMembersData = membersData.filter(isMembershipExpired);
  if (expiredMembersData.length === 0) {
    await fetchDailyCall();
    return;
  }

  // now, you have at least one member with expired group membership
  // for those members, ask Okta to remove the group membership
  expiredMembersData.forEach(async (memberData) => {
    await fetchGroupMembershipRemoval(memberData);
  });

  // from here is for cleaning up the data and leave the log
  // you need to update groupsWithDuration.csv to exclude removed members
  const remainingMembersData = membersData.filter((member) => {
    const isExpired = isMembershipExpired(member);
    return !isExpired;
  });

  writeDataToFile(
    getNormalizedPath("data", "membersExpireOn.csv"),
    {
      dataKeys: membersDataWithShape.dataKeys,
      data: remainingMembersData,
    },
    "overwrite"
  );

  // in the daily log, store the information about the removed members
  writeDataToFile(
    getNormalizedPath(
      "log",
      `membershipRemoved-${DateTime.now().toFormat("yyyy-MM-dd")}.csv`
    ),
    {
      dataKeys: membersDataWithShape.dataKeys,
      data: expiredMembersData,
    },
    "new"
  );
}

// You can create other cronjobs and exports them to main.js
// in case you have tasks to be executed once an hour, or twice a month

// const testCron = cron.schedule("30 * * * * *", async () => {
//   console.log("this is the other cronjob!");
// });

// helper function to calculate whether the membership is expired or not
function isMembershipExpired(memberData) {
  const today = DateTime.fromFormat(
    DateTime.now().toFormat("MM/dd/yyyy"),
    "MM/dd/yyyy"
  );
  const expireOn = DateTime.fromFormat(memberData.expireOn, "MM/dd/yyyy");
  const isExpired = expireOn <= today;
  return isExpired;
}

module.exports = { dailyCron };
