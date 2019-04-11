const fs = require("fs");
const yaml = require("js-yaml");
const cli = require("inquirer");
const LambdaDatabase = require("./Database");
const cal = require("./Calculator");
const csv = require("./CSVLoader");
const fmt = require("./format");

const lambdaTablePath = 'data/lambda_cmos_w=1u_vds=0.45v.csv';

const doc = yaml.safeLoad(fs.readFileSync('src/spec.yml'), 'utf-8');
const proc = doc.process;
const spec = doc.spec;

const Database = new LambdaDatabase();
const DBZero = {
  length: 1,
  lambda_n: 0,
  lambda_p: 0
}

let data = [];
if (fs.existsSync(lambdaTablePath))
  data = csv.load('data/lambda_cmos_w=1u_vds=0.45v.csv', ',');
for (let i = 0; i < data.length; ++i) {
  data[i]['length'] *= 1000000;
}
Database.save(data);
//console.log(Database.data);

const questions = {
  welcome: [
    {
      type: 'confirm',
      name: 'continue',
      message: 'Are you ready to start the design flow?',
      default: () => { return true }
    }
  ],
  stage1: [
    {
      type: 'number',
      name: 'target_ugbw',
      message: 'What\'s your target unity-gain bandwidth (MHz)?',
      default: () => { return spec.min_ugbw / Number(1e+6) }
    },
    {
      type: 'number',
      name: 'target_slew_rate',
      message: 'What\'s your target slew rate (V/us)?',
      default: () => { return spec.min_sr / Number(1e+6) }
    },
    {
      type: 'number',
      name: 'target_vov1',
      message: 'What\'s the override voltage you want for M1,2 (V)?',
      default: () => { return spec.vov }
    }
  ],
  stage1_1: [
    {
      type: 'number',
      name: 'confirm_id',
      message: 'Decide your id1, leave 0 to use recommended value (uA).',
      default: 0
    },
    {
      type: 'number',
      name: 'target_vovb',
      message: 'What\'s the override voltage you want for Mb1,b2 (V)?',
      default: spec.vov
    },
    {
      type: 'number',
      name: 'target_vov3',
      message: 'What\'s the override voltage you want for M3,4 (V)?',
      default: spec.vov
    },
    {
      type: 'number',
      name: 'target_vov5',
      message: 'What\'s the override voltage you want for M5,6 (V)?',
      default: spec.vov
    },
    {
      type: 'number',
      name: 'target_vov7',
      message: 'What\'s the override voltage you want for M7-10 (V)?',
      default: spec.vov
    }
  ],
  stage2: [
    {
      type: 'number',
      name: 'target_gain',
      message: 'What\'s the gain you want (dB)?',
      default: () => { return spec.min_gain }
    }
  ]
}

function entry() {
  cli.prompt(questions.welcome).then(answers => {
    if (answers.continue)
      stage1();
  });
}

function stage1() {
  cli.prompt(questions.stage1).then(answers => {
    let ugbw = answers.target_ugbw * Number(1e+6);
    let sr = answers.target_slew_rate * Number(1e+6);
    let vov1 = answers.target_vov1;
    let gm1 = 2 * Math.PI * spec.c_load * ugbw;
    let id1_from_gm = vov1 * gm1 / 2;
    let id1_from_sr = spec.c_load * sr / 2;
    let id1 = Math.max(id1_from_gm, id1_from_sr);
    console.log(`At override voltage of ${vov1} V,`);
    console.log(`You need id_1,2 >= ${fmt.id(id1_from_gm)} uA to achieve UGBW.`);
    console.log(`You need id_1,2 >= ${fmt.id(id1_from_sr)} uA to achieve SR.`);
    console.log(`The required minimum id_1,2 = ${fmt.id(id1)} uA.\n`);
    console.log(`Then id_b1,b2,3,4 = ${fmt.id(2 * id1)} uA.`);
    console.log(`Also id_5-10 = ${fmt.id(id1)} uA.`);
    stage1_1({ id1, vov1 });
  });
}

function stage1_1(prevResult) {
  let pv = prevResult;
  cli.prompt(questions.stage1_1).then(answers => {
    let confirm_id = answers.confirm_id;
    let vovb = answers.target_vovb;
    let vov3 = answers.target_vov3;
    let vov5 = answers.target_vov5;
    let vov7 = answers.target_vov7;
    let id1 = confirm_id ? confirm_id / Number(1e+6) : pv.id1;
    if (id1 >= pv.id1) {
      console.log(`Your id1 is OK.`);
      let gmb = cal.gm(2 * id1, vovb);
      let gm1 = cal.gm(id1, pv.vov1);
      let gm3 = cal.gm(2 * id1, vov3);
      let gm5 = cal.gm(id1, vov5);
      let gm7 = cal.gm(id1, vov7);
      console.log(`Your gm_b1,b2 = ${fmt.gm(gmb)} mA/V.`);
      console.log(`Your gm_1,2   = ${fmt.gm(gm1)} mA/V.`);
      console.log(`Your gm_3,4   = ${fmt.gm(gm3)} mA/V.`);
      console.log(`Your gm_5,6   = ${fmt.gm(gm5)} mA/V.`);
      console.log(`Your gm_7-10  = ${fmt.gm(gm7)} mA/V.`);
      stage2({
        id1,
        gmb, gm1, gm3, gm5, gm7,
        vovb, vov1: pv.vov1, vov3, vov5, vov7
      });
    } else {
      console.log(`Your id1 need to be > ${fmt.id(pv.id1)} uA.`);
      stage1_1(pv);
    }
  });
}

function stage2(prevResult) {
  let pv = prevResult;
  cli.prompt(questions.stage2).then(answers => {
    let gain = cal.toVV(answers.target_gain);
    let rout = gain / pv.gm1;
    let ro70 = Math.sqrt(2 * rout / pv.gm7);
    let ro34 = 0.5 * ro70;
    let ro12 = ro70;
    let ro56 = ro70;
    let rocs = 0.5 * ro12;
    let lambda12p = cal.lambda(pv.id1, ro12, spec.vds);
    let lambda34n = cal.lambda(2 * pv.id1, ro34, spec.vds);
    let lambda56n = cal.lambda(pv.id1, ro56, spec.vds);
    let lambda70p = cal.lambda(pv.id1, ro70, spec.vds);
    let lambdacsp = cal.lambda(2 * pv.id1, rocs, spec.vds);
    let _l12 = {};
    let _l34 = {};
    let _l56 = {};
    let _l70 = {};
    let _lcs = {};
    if (false) {
      _l12 = Database.lookApprox('lambda_p', lambda12p);
      _l34 = Database.lookApprox('lambda_n', lambda34n);
      _l56 = Database.lookApprox('lambda_n', lambda56n);
      _l70 = Database.lookApprox('lambda_p', lambda70p);
      _lcs = Database.lookApprox('lambda_p', lambdacsp);
    } else {
      _l12 = DBZero;
      _l34 = DBZero;
      _l56 = DBZero;
      _l70 = DBZero;
      _lcs = DBZero;
    }
    let l12 = _l12.length;
    let l34 = _l34.length;
    let l56 = _l56.length;
    let l70 = _l70.length;
    let lcs = _lcs.length;
    let w12 = cal.width(pv.id1, l12, pv.vov1, proc.kp, _l12.lambda_p, spec.vds);
    let w34 = cal.width(2 * pv.id1, l34, pv.vov3, proc.kn, _l34.lambda_n, spec.vds);
    let w56 = cal.width(pv.id1, l56, pv.vov5, proc.kn, _l56.lambda_n, spec.vds);
    let w70 = cal.width(pv.id1, l70, pv.vov7, proc.kp, _l70.lambda_p, spec.vds);
    let wcs = cal.width(2 * pv.id1, lcs, pv.vovb, proc.kp, _lcs.lambda_p, spec.vds);

    let vgs_b1_b2 = cal.vgs(pv.vovb, proc.vth0_p);
    let vgs_3_4 = cal.vgs(pv.vov3, proc.vth0_n);
    let vgs_5_6 = cal.vgs(pv.vov5, proc.vth0_n + proc.vth_n_comp);
    let vbp1 = spec.vdd - vgs_b1_b2;
    let vbp2 = spec.vdd - spec.vds - vgs_b1_b2;
    let vbn1 = vgs_3_4;
    let vbn2 = spec.vds + vgs_5_6;

    console.log(`You have ro_1,2 = ${ro12}, ro_3,4 = ${ro34}`);
    console.log(`You have ro_5,6 = ${ro56}, ro_7-10 = ${ro70}`);
    console.log(`You have ro_b1,b2 = ${rocs}\n`);

    console.log(`You have length_1,2 = ${fmt.wl(l12)}, length_3,4 = ${fmt.wl(l34)}`);
    console.log(`You have length_5,6 = ${fmt.wl(l56)}, length_7-10 = ${fmt.wl(l70)}`);
    console.log(`You have length_b1,b2 = ${fmt.wl(lcs)}`);
    console.log(`You have width_1,2 = ${fmt.wl(w12)}, width_3,4 = ${fmt.wl(w34)}`);
    console.log(`You have width_5,6 = ${fmt.wl(w56)}, width_7-10 = ${fmt.wl(w70)}`);
    console.log(`You have width_b1,b2 = ${fmt.wl(wcs)}\n`);

    console.log(`Lambda lookup confidence:`);
    console.log(`MOSFET Calculated          Actual Device `);
    console.log(`M1,2   ${lambda12p} ${_l12.lambda_p}`);
    console.log(`M3,4   ${lambda34n} ${_l34.lambda_n}`);
    console.log(`M5,6   ${lambda56n} ${_l56.lambda_n}`);
    console.log(`M7-10  ${lambda70p} ${_l70.lambda_p}`);
    console.log(`Mb1b2  ${lambdacsp} ${_lcs.lambda_p}\n`);

    console.log(`VGS_b1,b2 = ${vgs_b1_b2}, VGS_3,4 = ${vgs_3_4}, VGS_5,6 = ${vgs_5_6}`);
    console.log(`Need to set VBP1 = ${vbp1}, VBP2 = ${vbp2}`);
    console.log(`Need to set VBN1 = ${vbn1}, VBN2 = ${vbn2}`);
  });
}

entry();