class LambdaDatabase {
  constructor() {
    this.data = [];
  }

  /**
   * Save Data Table
   * @param {Array} data 
   */
  save(data) {
    if (Array.isArray(data)) {
      this.data = data;
    }
  }

  /**
   * Lookup a row with header and value.
   * @param {string} colHeader 
   * @param {number} value 
   */
  lookup(colHeader, value) {
    const table = this.data;
    for (let i = 0; i < table.length; ++i) {
      if (table[i][colHeader].toFixed(2) === value.toFixed(2)) {
        return table[i];
      }
    }
  }

  /**
   * Lookup a row with header and closest value.
   * @param {string} colHeader 
   * @param {number} value 
   */
  lookApprox(colHeader, value) {
    const table = this.data;
    let lastMin = Infinity;
    let approxRow = {};
    for (let i = 0; i < table.length; ++i) {
      let newMin = Math.abs(table[i][colHeader] - value);
      if (newMin < lastMin) {
        approxRow = table[i];
        lastMin = newMin;
      }
    }
    return approxRow;
  }
}

module.exports = LambdaDatabase;