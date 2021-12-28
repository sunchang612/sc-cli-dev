'use strict';

const log = require('npmlog')

// TODO
log.verbose('cli', 'test')
// log.level = '' 设置 log level 的等级 默认是 info 如果打印比它等级低了，就不会打印出来
// log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'
log.addLevel('success', 2000, { fg: 'green'})
module.exports = log;


