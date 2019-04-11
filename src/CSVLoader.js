const fs = require("fs");

let CSVLoader = function (csv) {

  csv.load = (file, delim) => {
    const csv = fs.readFileSync(file, "utf-8");
    const rows = csv.split('\n');
    const headers = rows[0].split(delim);
    const data = [];
    rows.splice(0, 1);
    for (let i = 0; i < rows.length; ++i) {
      let rowVals = rows[i].split(delim);
      let rowObj = {};
      for (let j = 0; j < rowVals.length; ++j) {
        rowObj[headers[j]] = parseFloat(rowVals[j]);
      }
      data.push(rowObj);
    }
    return data;
  }

  return csv;
}({});

module.exports = CSVLoader;