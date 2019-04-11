let Calculator = function (cal) {
  
  cal.wlRatio = (id, vov, k, lambda, vds) => {
    const p = 2 * id;
    const q = vov * vov * k * (1 + lambda * vds);
    return p / q;
  }

  cal.width = (id, l, vov, k, lambda, vds) => {
    const p = 2 * id * l;
    const q = vov * vov * k * (1 + lambda * vds);
    return p / q;
  }

  cal.gm = (id, vov) => {
    return (2 * id) / vov;
  }

  cal.ro = (lambda, vds, id) => {
    return (1 + lambda * vds) / (lambda * id);
  }

  cal.lambda = (id, ro, vds) => {
    return 1 / (id * ro - vds);
  }

  cal.f3db = (r, c) => {
    return 1 / (2 * Math.PI * r * c);
  }

  cal.vgs = (vov, vth) => {
    return vov + vth;
  }

  cal.toVV = (db) => {
    return Math.pow(10, db / 20);
  }

  cal.todB = (vv) => {
    return 20 * Math.log10(vv);
  }

  cal.gain = (gm1, gm5, gm7, ro1, ro3, ro5, ro7, ro9) => {
    let left = gm5 * ((ro1 * ro3) / (ro1 + ro3)) * ro5;
    let right = gm7 * ro7 * ro9;
    let rout = (left * right) / (left + right);
    return gm1 * rout;
  }

  return cal;
}({});

module.exports = Calculator;