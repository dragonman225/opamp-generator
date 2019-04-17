const fs = require("fs");
const yaml = require("js-yaml");
const cli = require("inquirer");
const LambdaDatabase = require("./Database");
const cal = require("./Calculator");
const csv = require("./CSVLoader");
const fmt = require("./format");
const questions = require("./questions");

const doc = yaml.safeLoad(fs.readFileSync('src/config.yml'), 'utf-8');
const proc = doc.process;
const spec = doc.spec;
const lambdaTablePath = doc.lambda_table;

const Database = new LambdaDatabase();
const DBZero = {
  length: proc.target_length,
  lambda_n: 0,
  lambda_p: 0
}

let data = [];
if (fs.existsSync(lambdaTablePath))
  data = csv.load(lambdaTablePath, ',');
for (let i = 0; i < data.length; ++i) {
  data[i]['length'] *= 1000000;
}
Database.save(data);
console.log(`${Database.data.length} rows in lambda lookup table.\n`);

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
    let id1_ugbw = vov1 * gm1 / 2;
    let id8 = spec.c_load * sr;
    console.log(`\nYou need id_1,2 >= ${fmt.id(id1_ugbw)} uA to achieve UGBW.`);
    console.log(`You need id_8,10 and id_1,2 >= ${fmt.id(id8)} uA to achieve SR.\n`);
    let id1 = 0;
    if (id1_ugbw < id8) {
      id1 = id8;
    } else {
      id1 = id1_ugbw;
    }
    stage1_1({ id1, id8, vov1 });
  });
}

function stage1_1(prevResult) {
  let pv = prevResult;
  cli.prompt(questions.stage1_1).then(answers => {
    let confirm_id1 = answers.confirm_id1;
    let confirm_id8 = answers.confirm_id8;
    let vovb = answers.target_vovb;
    let vov3 = answers.target_vov3;
    let vov5 = answers.target_vov5;
    let vov7 = answers.target_vov7;
    let vov9 = answers.target_vov9;
    let id1 = confirm_id1 ? confirm_id1 / Number(1e+6) : pv.id1;
    let id8 = confirm_id8 ? confirm_id8 / Number(1e+6) : pv.id8;
    if (id1 >= pv.id1 && id8 >= pv.id8 && id1 >= id8) {
      console.log(`\nYour id1 and id8 are OK.\n`);
      let gmb = cal.gm(2 * id1, vovb);
      let gm1 = cal.gm(id1, pv.vov1);
      let gm3 = cal.gm(id1 + id8, vov3);
      let gm5 = cal.gm(id8, vov5);
      let gm7 = cal.gm(id8, vov7);
      let gm9 = cal.gm(id8, vov9);
      stage2({
        id1, id8,
        gmb, gm1, gm3, gm5, gm7, gm9,
        vovb, vov1: pv.vov1, vov3, vov5, vov7, vov9
      });
    } else {
      console.log(`\nYour ids are too small. Or your id1 < id8.\n`);
      stage1_1(pv);
    }
  });
}

function stage2(prevResult) {
  let pv = prevResult;
  cli.prompt(questions.stage2).then(answers => {
    let gain = cal.toVV(answers.target_gain);
    let rout = gain / pv.gm1;

    let ro90 = Math.sqrt((spec.magic_k + 1) * rout / pv.gm7);
    let ro78 = ro90;
    let ro12pararo34 = Math.sqrt((spec.magic_k + 1) * rout / (spec.magic_k * spec.magic_m * pv.gm5));
    let ro34 = (spec.magic_n + 1) * ro12pararo34 / spec.magic_n;
    let ro56 = spec.magic_m * ro12pararo34;
    let ro12 = spec.magic_n * ro34;
    let rocs = 0.1 * ro12;
    let gain_est = cal.gain(pv.gm1, pv.gm5, pv.gm7, ro12, ro34, ro56, ro78, ro90);

    let lambda12p = cal.lambda(pv.id1, ro12, spec.vds);
    let lambda34n = cal.lambda(pv.id1 + pv.id8, ro34, spec.vds);
    let lambda56n = cal.lambda(pv.id8, ro56, spec.vds);
    let lambda78p = cal.lambda(pv.id8, ro78, spec.vds);
    let lambda90p = cal.lambda(pv.id8, ro90, spec.vds);
    let lambdacsp = cal.lambda(2 * pv.id1, rocs, spec.vds);

    let lambda12FromTable = {};
    let lambda34FromTable = {};
    let lambda56FromTable = {};
    let lambda78FromTable = {};
    let lambda90FromTable = {};
    let lambdaCSFromTable = {};

    if (answers.consider_clm && Database.data.length > 0) {
      console.log(`\nChannel-length modulation effects will be considered.\n`);
      lambda12FromTable = Database.lookApprox('lambda_p', lambda12p);
      lambda34FromTable = Database.lookApprox('lambda_n', lambda34n);
      lambda56FromTable = Database.lookApprox('lambda_n', lambda56n);
      lambda78FromTable = Database.lookApprox('lambda_p', lambda78p);
      lambda90FromTable = Database.lookApprox('lambda_p', lambda90p);
      lambdaCSFromTable = Database.lookApprox('lambda_p', lambdacsp);
    } else {
      if (answers.consider_clm && Database.data.length === 0) {
        console.log(`\nYour lambda lookup table is empty.`);
      }
      console.log(`\nChannel-length modulation effects will be ignored.`);
      console.log(`Gain is not guaranteed since I cannot calculate length without lambda.`);
      console.log(`A general value of length is used.\n`);
      lambda12FromTable = DBZero;
      lambda34FromTable = DBZero;
      lambda56FromTable = DBZero;
      lambda78FromTable = DBZero;
      lambda90FromTable = DBZero;
      lambdaCSFromTable = DBZero;
    }

    let l12 = lambda12FromTable.length;
    let l34 = 0;
    if (answers.consider_clm) {
      l34 = lambda34FromTable.length;
    } else {
      l34 = lambda34FromTable.length * 2;
    }
    let l56 = lambda56FromTable.length;
    let l78 = lambda78FromTable.length;
    let l90 = lambda90FromTable.length;
    let lcs = lambdaCSFromTable.length;

    let w12 = cal.width(pv.id1, l12, pv.vov1, proc.kp, lambda12FromTable.lambda_p, spec.vds);
    let w34 = cal.width(pv.id1 + pv.id8, l34, pv.vov3, proc.kn, lambda34FromTable.lambda_n, spec.vds);
    let w56 = cal.width(pv.id8, l56, pv.vov5, proc.kn, lambda56FromTable.lambda_n, spec.vds);
    let w78 = cal.width(pv.id8, l78, pv.vov7, proc.kp, lambda78FromTable.lambda_p, spec.vds);
    let w90 = cal.width(pv.id8, l90, pv.vov9, proc.kp, lambda90FromTable.lambda_p, spec.vds);
    let wcs = cal.width(2 * pv.id1, lcs, pv.vovb, proc.kp, lambdaCSFromTable.lambda_p, spec.vds);

    let vgs_b1_b2 = cal.vgs(pv.vovb, proc.vth0_p);
    let vgs_3_4 = cal.vgs(pv.vov3, proc.vth0_n);
    let vgs_5_6 = cal.vgs(pv.vov5, proc.vth0_n + proc.vth_n_comp);
    let vbp1 = spec.vdd - vgs_b1_b2;
    let vbp2 = spec.vdd - spec.vds - vgs_b1_b2;
    let vbn1 = vgs_3_4;
    let vbn2 = spec.vds + vgs_5_6;

    console.log(`Lambda Lookup Confidence:`);
    console.log(`MOSFET Calculated          Actual Device `);
    console.log(`M1,2   ${lambda12p} ${lambda12FromTable.lambda_p}`);
    console.log(`M3,4   ${lambda34n} ${lambda34FromTable.lambda_n}`);
    console.log(`M5,6   ${lambda56n} ${lambda56FromTable.lambda_n}`);
    console.log(`M7,8   ${lambda78p} ${lambda78FromTable.lambda_p}`);
    console.log(`M9,10  ${lambda90p} ${lambda90FromTable.lambda_p}`);
    console.log(`Mb1b2  ${lambdacsp} ${lambdaCSFromTable.lambda_p}\n`);

    console.log(`Calculated VGS (V):`);
    console.log(`VGS_b1,b2 = ${vgs_b1_b2}, VGS_3,4 = ${vgs_3_4}, VGS_5,6 = ${vgs_5_6}\n`);

    console.log(`Estimate gain = ${cal.todB(gain_est)} dB.\n`)

    console.log(`Your MOSFET Parameters:`);
    console.table([
      {
        instance: "Mb1,b2",
        "width (um)": fmt.wl(wcs), "length (um)": fmt.wl(lcs),
        "gm (mA/V)": fmt.gm(pv.gmb), "id (uA)": fmt.id(2 * pv.id1),
        "ro (Ohm)": rocs
      },
      {
        instance: "M1,2",
        "width (um)": fmt.wl(w12), "length (um)": fmt.wl(l12),
        "gm (mA/V)": fmt.gm(pv.gm1), "id (uA)": fmt.id(pv.id1),
        "ro (Ohm)": ro12
      },
      {
        instance: "M3,4",
        "width (um)": fmt.wl(w34), "length (um)": fmt.wl(l34),
        "gm (mA/V)": fmt.gm(pv.gm3), "id (uA)": fmt.id(pv.id1 + pv.id8),
        "ro (Ohm)": ro34
      },
      {
        instance: "M5,6",
        "width (um)": fmt.wl(w56), "length (um)": fmt.wl(l56),
        "gm (mA/V)": fmt.gm(pv.gm5), "id (uA)": fmt.id(pv.id8),
        "ro (Ohm)": ro56
      },
      {
        instance: "M7,8",
        "width (um)": fmt.wl(w78), "length (um)": fmt.wl(l78),
        "gm (mA/V)": fmt.gm(pv.gm7), "id (uA)": fmt.id(pv.id8),
        "ro (Ohm)": ro78
      },
      {
        instance: "M9,10",
        "width (um)": fmt.wl(w90), "length (um)": fmt.wl(l90),
        "gm (mA/V)": fmt.gm(pv.gm9), "id (uA)": fmt.id(pv.id8),
        "ro (Ohm)": ro90
      }
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