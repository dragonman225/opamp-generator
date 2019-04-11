const fs = require("fs");
const yaml = require("js-yaml");
const cli = require("inquirer");
const LambdaDatabase = require("./Database");
const cal = require("./Calculator");
const csv = require("./CSVLoader");
const fmt = require("./format");
const questions = require("./questions");

const lambdaTablePath = 'data/lambda_cmos_w=1u_vds=0.45v.csv';

const doc = yaml.safeLoad(fs.readFileSync('src/spec.yml'), 'utf-8');
const proc = doc.process;
const spec = doc.spec;

const Database = new LambdaDatabase();
const DBZero = {
  length: 0.5,
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
    let vov9 = answers.target_vov9;
    let id1 = confirm_id ? confirm_id / Number(1e+6) : pv.id1;
    if (id1 >= pv.id1) {
      console.log(`Your id1 is OK.`);
      let gmb = cal.gm(2 * id1, vovb);
      let gm1 = cal.gm(id1, pv.vov1);
      let gm3 = cal.gm(2 * id1, vov3);
      let gm5 = cal.gm(id1, vov5);
      let gm7 = cal.gm(id1, vov7);
      let gm9 = cal.gm(id1, vov9);
      console.log(`Your gm_b1,b2 = ${fmt.gm(gmb)} mA/V.`);
      console.log(`Your gm_1,2   = ${fmt.gm(gm1)} mA/V.`);
      console.log(`Your gm_3,4   = ${fmt.gm(gm3)} mA/V.`);
      console.log(`Your gm_5,6   = ${fmt.gm(gm5)} mA/V.`);
      console.log(`Your gm_7,8   = ${fmt.gm(gm7)} mA/V.`);
      console.log(`Your gm_9,10  = ${fmt.gm(gm9)} mA/V.`);
      stage2({
        id1,
        gmb, gm1, gm3, gm5, gm7, gm9,
        vovb, vov1: pv.vov1, vov3, vov5, vov7, vov9
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

    let ro78 = Math.sqrt(2 * rout / pv.gm7);
    let ro90 = ro78;
    let ro12 = ro78;
    let ro34 = ro78;
    let ro56 = ro78;
    let rocs = 0.5 * ro12;
    let gain_est = cal.gain(pv.gm1, pv.gm5, pv.gm7, ro12, ro34, ro56, ro78, ro90);

    let lambda12p = cal.lambda(pv.id1, ro12, spec.vds);
    let lambda34n = cal.lambda(2 * pv.id1, ro34, spec.vds);
    let lambda56n = cal.lambda(pv.id1, ro56, spec.vds);
    let lambda78p = cal.lambda(pv.id1, ro78, spec.vds);
    let lambda90p = cal.lambda(pv.id1, ro90, spec.vds);
    let lambdacsp = cal.lambda(2 * pv.id1, rocs, spec.vds);

    let lambda12FromTable = {};
    let lambda34FromTable = {};
    let lambda56FromTable = {};
    let lambda78FromTable = {};
    let lambda90FromTable = {};
    let lambdaCSFromTable = {};

    if (answers.consider_clm) {
      console.log(`Channel-length modulation effects will be considered.\n`);
      lambda12FromTable = Database.lookApprox('lambda_p', lambda12p);
      lambda34FromTable = Database.lookApprox('lambda_n', lambda34n);
      lambda56FromTable = Database.lookApprox('lambda_n', lambda56n);
      lambda78FromTable = Database.lookApprox('lambda_p', lambda78p);
      lambda90FromTable = Database.lookApprox('lambda_p', lambda90p);
      lambdaCSFromTable = Database.lookApprox('lambda_p', lambdacsp);
    } else {
      console.log(`Channel-length modulation effects will be ignored.\n`);
      lambda12FromTable = DBZero;
      lambda34FromTable = DBZero;
      lambda56FromTable = DBZero;
      lambda78FromTable = DBZero;
      lambda90FromTable = DBZero;
      lambdaCSFromTable = DBZero;
    }

    let l12 = lambda12FromTable.length;
    let l34 = lambda34FromTable.length;
    let l56 = lambda56FromTable.length;
    let l78 = lambda78FromTable.length;
    let l90 = lambda90FromTable.length;
    let lcs = lambdaCSFromTable.length;

    let w12 = cal.width(pv.id1, l12, pv.vov1, proc.kp, lambda12FromTable.lambda_p, spec.vds);
    let w34 = cal.width(2 * pv.id1, l34, pv.vov3, proc.kn, lambda34FromTable.lambda_n, spec.vds);
    let w56 = cal.width(pv.id1, l56, pv.vov5, proc.kn, lambda56FromTable.lambda_n, spec.vds);
    let w78 = cal.width(pv.id1, l78, pv.vov7, proc.kp, lambda78FromTable.lambda_p, spec.vds);
    let w90 = cal.width(pv.id1, l90, pv.vov9, proc.kp, lambda90FromTable.lambda_p, spec.vds);
    let wcs = cal.width(2 * pv.id1, lcs, pv.vovb, proc.kp, lambdaCSFromTable.lambda_p, spec.vds);

    let vgs_b1_b2 = cal.vgs(pv.vovb, proc.vth0_p);
    let vgs_3_4 = cal.vgs(pv.vov3, proc.vth0_n);
    let vgs_5_6 = cal.vgs(pv.vov5, proc.vth0_n + proc.vth_n_comp);
    let vbp1 = spec.vdd - vgs_b1_b2;
    let vbp2 = spec.vdd - spec.vds - vgs_b1_b2;
    let vbn1 = vgs_3_4;
    let vbn2 = spec.vds + vgs_5_6;

    console.log(`Lambda lookup confidence:`);
    console.log(`MOSFET Calculated          Actual Device `);
    console.log(`M1,2   ${lambda12p} ${lambda12FromTable.lambda_p}`);
    console.log(`M3,4   ${lambda34n} ${lambda34FromTable.lambda_n}`);
    console.log(`M5,6   ${lambda56n} ${lambda56FromTable.lambda_n}`);
    console.log(`M7,8   ${lambda78p} ${lambda78FromTable.lambda_p}`);
    console.log(`M9,10  ${lambda90p} ${lambda90FromTable.lambda_p}`);
    console.log(`Mb1b2  ${lambdacsp} ${lambdaCSFromTable.lambda_p}\n`);

    console.log(`Calculated VGS (V):`);
    console.log(`VGS_b1,b2 = ${vgs_b1_b2}, VGS_3,4 = ${vgs_3_4}, VGS_5,6 = ${vgs_5_6}\n`);

    console.log(`Your ro:`);
    console.log(`ro_1,2 = ${ro12}, ro_b1,b2 = ${rocs}`);
    console.log(`ro_3,4 = ${ro34}, ro_5,6 = ${ro56}`);
    console.log(`ro_7,8 = ${ro78}, ro_9,10 = ${ro90}\n`);
    console.log(`Calculated gain = ${cal.todB(gain_est)} dB.`)

    console.log(`Your MOSFET Sizes (um):`);
    console.table([
      { instance: "Mb1,b2", width: fmt.wl(wcs), length: fmt.wl(lcs) },
      { instance: "M1,2", width: fmt.wl(w12), length: fmt.wl(l12) },
      { instance: "M3,4", width: fmt.wl(w34), length: fmt.wl(l34) },
      { instance: "M5,6", width: fmt.wl(w56), length: fmt.wl(l56) },
      { instance: "M7,8", width: fmt.wl(w78), length: fmt.wl(l78) },
      { instance: "M9,10", width: fmt.wl(w90), length: fmt.wl(l90) }
    ]);

    console.log(`Your Bias Voltages (V):`);
    console.table([
      { point: "VBP1", voltage: vbp1 },
      { point: "VBP2", voltage: vbp2 },
      { point: "VBN1", voltage: vbn1 },
      { point: "VBN2", voltage: vbn2 }
    ]);
  });
}

entry();