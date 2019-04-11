const fs = require("fs");
const yaml = require("js-yaml");

const doc = yaml.safeLoad(fs.readFileSync('src/spec.yml'), 'utf-8');
const spec = doc.spec;

const Questions = {
  welcome: [
    {
      type: 'confirm',
      name: 'continue',
      message: 'Are you ready to start the design flow?',
      default: true
    }
  ],
  stage1: [
    {
      type: 'number',
      name: 'target_ugbw',
      message: 'What\'s your target unity-gain bandwidth (MHz)?',
      default: spec.min_ugbw / Number(1e+6)
    },
    {
      type: 'number',
      name: 'target_slew_rate',
      message: 'What\'s your target slew rate (V/us)?',
      default: spec.min_sr / Number(1e+6)
    },
    {
      type: 'number',
      name: 'target_vov1',
      message: 'What\'s the override voltage you want for M1,2 (V)?',
      default: spec.vov
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
      message: 'What\'s the override voltage you want for M7,8 (V)?',
      default: spec.vov
    },
    {
      type: 'number',
      name: 'target_vov9',
      message: 'What\'s the override voltage you want for M9,10 (V)?',
      default: spec.vov
    }
  ],
  stage2: [
    {
      type: 'number',
      name: 'target_gain',
      message: 'What\'s the gain you want (dB)?',
      default: spec.min_gain
    },
    {
      type: 'confirm',
      name: 'consider_clm',
      message: 'Do you want to consider channel-length modulation effects?',
      default: false
    }
  ]
}

module.exports = Questions;