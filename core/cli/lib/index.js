'use strict';

module.exports = core;
let args

const semver = require('semver')
const colors = require('colors/safe')
const rootCheck = require('root-check')
const userHome = require('user-home')
const pathExists = require('path-exists')
const path = require('path')
const commander = require('commander')
const pkg = require('../package.json')
const log = require('@sc-cli-dev/log')
const init = require('@sc-cli-dev/init')
const exec = require('@sc-cli-dev/exec')
const { LOWEST_VERSION } = require('./const')
const { program } = commander

function core() {
  // 获取版本号
  try {
    prepare()
    registerCommand()
  } catch (e) {
    log.error('报错了--->', e.message)
  }

}

function prepare () {
  // 检查包版本
  checkPkgVersion()
  // 检查node版本
  checkNodeVersion()
  // 检查是否为 Root 权限，进行降权操作
  checkRoot()
  // 检查 home 文件是否存在
  checkHome()
  // 检查环境变量
  checkEnv()
  // 检查入参
  checkInputArgs()
  // 检查版本是否为最新版本
  // await checkGlobalUpdate()

}


// 注册脚手架
function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('command [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启debug模式', false)
    .option('-p, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec);


  // 开启 debug 模式
  program.on('option:debug', function () {
    if (program.debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
  })

  // 指定 targetPath
  program.on('option:targetPath', function () {
    // 获取命令中的命令信息
    // 使用环境变量，增加全局参数
    process.env.CLI_TARGET_PATH = this.opts().targetPath
  })

  // 自定义监听 监听命令是否存在
  program.on('command:*', function (obj) {
    const availableCommand = program.commands.map(cmd => cmd.name)
    log.info('未知的命令', obj[0])
    if (availableCommand.length) {
      log.success('可用命令', availableCommand)
    }
  })
  program.parse(process.argv)
  // 如果没有输入参数，打印出帮助文档（包含输入 - 等参数）
  if(program.args && program.args.length < 1) {
    program.outputHelp()
  }
}

// 检查版本号
function checkPkgVersion () {
  log.notice('version', pkg.version)
}

// 检查 node 版本号
function checkNodeVersion () {
  // 当前的版本号
  console.log(process.version)
  const version = process.version
  if (!semver.gte(version, LOWEST_VERSION)) {
    throw new Error(colors.red(`需要安装 ${LOWEST_VERSION} 以上的node版本`))
  }
}

// 检查 root 账号
function checkRoot () {
  // 使用 sudo uid 是 0
  rootCheck()
  console.log(process.geteuid())
}

// 检查主目录是否存在
function checkHome () {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red(('当前用户主目录不存在')))
  }
  console.log(userHome, pathExists.sync(userHome));
}

// 检查入参
function checkInputArgs () {
  const minimist = require('minimist')
  args = minimist(process.argv.slice(2))
  console.log('args', args)
  checkArgs()
}
// 检查是否开启 debug 模式
function checkArgs () {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose'
  } else {
     process.env.LOG_LEVEL = 'info'
  }

}

// 检查环境变量
function checkEnv () {
  const dotenv = require('dotenv')
  const config = dotenv.config({
    path: path.resolve(__dirname, '.env')
  })
  process.env.CLI_HOME_PATH = userHome + '/' + config.parsed.ENV;
  console.log('环境变量', process.env.CLI_HOME_PATH )
}

// 检查是否为最新版本
async function checkGlobalUpdate () {
  // 获取最新的版本号、模块名
  const version = pkg.version
  const npmName = pkg.name
  // 调用 npm api，获取所以的 版本号
  const { getNpmVersions } = require('@sc-cli-dev/get-npm-info')
  console.log('data --->', getNpmVersions())
  // 提取所有的版本号，比对哪些版本号是 > 当前版本号的
  // 提醒用户，是否更新版本
}
