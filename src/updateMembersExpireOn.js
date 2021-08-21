const path = require("path");
const { DateTime } = require("luxon");
const colors = require("colors/safe");

const {
  getDataFromFile,
  writeDataToFile,
  getNormalizedPath,
} = require("./csvReadWrite");

async function updateMembersExpireOn(event) {
  // parse the event to get user and group info
  const newData = {
    userName: event.target[0].alternateId,
    userId: event.target[0].id,
    groupName: event.target[1].displayName,
    groupId: event.target[1].id,
  };

  // parse the groupsWithDuration file to get duration
  const groupsDataWithShape = await getDataFromFile(
    getNormalizedPath("data", "groupsWithDuration.csv")
  );
  const groups = groupsDataWithShape.data;
  if (
    groups.length === 0 ||
    groups.filter((group) => group.groupName === newData.groupName).length !== 1
  ) {
    return;
  } else {
    console.log(
      DateTime.now().toString() +
        ": Group with the membership expiration setting detected. Performing relevant action..."
    );
    const duration = groups.filter(
      (group) => group.groupName === newData.groupName
    )[0].duration;

    // Calculate expireOn date for the specific user
    const expireOn = DateTime.now()
      .plus({ days: duration })
      .toFormat("MM/dd/yyyy");

    newData.expireOn = expireOn;
  }

  // Prepare the data with standard shape
  const newDataWithShape = {
    dataKeys: Object.keys(newData),
    data: [newData],
  };

  // Write the data into the memberExpireOn.csv file
  await writeDataToFile(
    getNormalizedPath("data", "membersExpireOn.csv"),
    newDataWithShape
  );

  console.log(
    DateTime.now().toString() +
      colors.blue(
        ": Membership expiration for " +
          colors.bgBlack.white(`${newDataWithShape.data[0].userName}`) +
          " on the group " +
          colors.bgBlack.white(`${newDataWithShape.data[0].groupName}`) +
          " on " +
          colors.bgBlack.white(`${newDataWithShape.data[0].expireOn}`) +
          " is successfully registered in membersExpireOn.csv file."
      )
  );
}

module.exports = updateMembersExpireOn;
