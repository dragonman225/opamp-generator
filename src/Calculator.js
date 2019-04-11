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
    return 20 * Math.log(vv);
  }

  return cal;
}({});

module.exports = Calculator;