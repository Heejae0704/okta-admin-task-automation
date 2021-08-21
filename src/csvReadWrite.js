const fs = require("fs");
const path = require("path");
const appDir = path.dirname(require.main.filename);

// below is the sample data with the standard shape that the file IO functions are expecting
// Why dataKeys? Because we may have an empty csv with only headers.

// const sampleDataWithShape = {
//   dataKeys: ["userName", "userId", "groupName", "groupId", "expireOn"],
//   data: [
//     {
//       userName: "frank.boone@oktaice.com",
//       userId: "00ubowezrMRUig5lu5d6",
//       groupName: "timed-test1-10days",
//       groupId: "00g1i8zzhglC5rJft5d7",
//       expireOn: "08/30/2021",
//     },
//   ],
// };

const getDataFromFile = async (path) => {
  try {
    const buff = await fs.promises.readFile(path);

    const contents = buff.toString();
    const data = convertContents(contents);

    return data;
  } catch (err) {
    console.log("Something went wrong while reading the file: " + path);
    console.log(err);
  }
};

const writeDataToFile = async (path, data, overwriteOrNew = false) => {
  try {
    let newDataArray = [];
    let stringData = "";
    if (!overwriteOrNew) {
      const existingData = await getDataFromFile(path);
      const dataKeys = existingData.dataKeys;
      newDataArray = [...existingData.data, ...data.data];
      stringData = convertDataToString(dataKeys, newDataArray);
    } else {
      newDataArray = [...data.data];
      if (newDataArray.length === 0) {
        stringData = data.dataKeys.join(",").trim();
      } else {
        stringData = convertDataToString(data.dataKeys, newDataArray);
      }
    }

    await fs.promises.writeFile(path, stringData);
  } catch (err) {
    console.log("Something went wrong while writing the file: " + path);
    console.log(err);
  }
};

// this is an helper function to convert string to the standard-shaped data object
function convertContents(contents) {
  const rows = contents.trim().split(`\n`);
  const keys = rows.slice(0, 1)[0].split(",");
  const values = rows.slice(1).map((str) => str.split(","));

  const data = values.map((row) => {
    const obj = {};
    row.forEach((el, idx) => (obj[keys[idx]] = el));
    return obj;
  });

  return {
    dataKeys: keys,
    data: data,
  };
}

// this is an helper function to convert the standard-shaped data object to csv strings
function convertDataToString(keys, dataArray) {
  const header = keys.join(",");
  const rows = dataArray.map((obj) => Object.values(obj).join(",")).join("\n");
  const stringData = header + "\n" + rows;
  return stringData.trim();
}

// this is an helper function to normalize the path in Linux, Mac and Windows environment
function getNormalizedPath(folder, file) {
  const appDir = path.dirname(require.main.filename);
  return path.normalize(appDir + "/" + folder + "/" + file);
}

module.exports = {
  getDataFromFile,
  writeDataToFile,
  getNormalizedPath,
};
