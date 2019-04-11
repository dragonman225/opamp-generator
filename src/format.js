let Format = function (format) {
  
  /**
   * @param {number} v - in SI
   * @returns {string} - in mA/V
   */
  format.gm = (v) => {
    return (v * 1000).toFixed(3);
  }

  /**
   * @param {number} v - in SI
   * @returns {string} - in uA
   */
  format.id = (v) => {
    return (v * 1000000).toFixed(0);
  }

  /**
   * @param {number} v - in SI
   * @returns {string} - in um
   */
  format.wl = (v) => {
    return parseFloat(v.toFixed(2));
  }

  return format;
}({});

module.exports = Format;