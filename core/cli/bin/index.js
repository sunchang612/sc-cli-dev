#! /usr/bin/env node

console.log('hello 1');
const importLocal  = require('import-local');

if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用本地的 cli')
} else {
  require('../lib')(process.argv.slice(2))
}