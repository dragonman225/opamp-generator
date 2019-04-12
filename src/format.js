let Format = function (format) {
  
  /**
   * @param {number} v - in SI
   * @returns {number} - in mA/V
   */
  format.gm = (v) => {
    return Math.round(v * 100000) / 100;
  }

  /**
   * @param {number} v - in SI
   * @returns {number} - in uA
   */
  format.id = (v) => {
    return Math.round(v * 1000000);
  }

  /**
   * @param {number} v - in um
   * @returns {number} - in um
   */
  format.wl = (v) => {
    return Math.round(v * 100) / 100;
  }

  /**
   * @param {number} v - in Ohm
   * @returns {number} - in Ohm
   */
  format.ro = (v) => {
    return Math.round(v * 100) / 100;
  }

  return format;
}({});

module.exports = Format;