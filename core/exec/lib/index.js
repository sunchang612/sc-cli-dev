'use strict';

const Package = require('@sc-cli-dev/package')
const log = require('@sc-cli-dev/log')
const path = require('path')
// const process = require("npminstall");
const { exec: spawn } = require('@sc-cli-dev/utils')

const SETTINGS = {
  init: 'vue'
}
const CACHE_DIR = 'dependencies';

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  // console.log('CLI_TARGET_PATH --->', process.env.CLI_TARGET_PATH)

  const homePath = process.env.CLI_HOME_PATH
  let storeDir = ''
  let pkg
  log.info('targetPath', targetPath)
  log.info('homePath', homePath)

  // 取出参数
  const comObj = arguments[arguments.length - 1]
  const comName = comObj.name()
  const packageName = SETTINGS[comName]
  const packageVersion = "3.2.21"

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR)
    storeDir = path.resolve(targetPath, 'node_modules')
    console.error('targetPath', targetPath)
    console.error('storeDir', storeDir)
    const pkg = new Package({ targetPath, packageName, packageVersion, storeDir })
    if (await pkg.exists()) {
      console.log('更新 package')
      await pkg.update()
    } else {
      try {
        await pkg.install()
      } catch (e) {
        console.log('install --->', e)
      }
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
    const rootFile = pkg.getRootFilePath()
    if (rootFile) {
      try {
        // 在当前进程中调用
        // require(rootFile).call(null, Array.from(arguments))
        // 在 node 子进程中调用
        const args = Array.from(arguments)
        const cmd = args[args.length - 1]
        const obj = Object.create(null)
        // 过滤掉一些参数
        Object.keys(cmd).forEach(k => {
          if (cmd.hasOwnProperty(k) && !k.startsWith('_') && k !== 'parent') {
            obj[k] = cmd[k]
          }
        })

        args[args.length - 1] = obj
        const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
        const child = spawn('node', ['-e', code], {
          cwd: process.cwd(),
          stdio: 'inherit'
        })
        child.on('error', e => {
          log.error(e.message)
          process.exit(1)
        })
        child.on('exit', e => {
          log.verbose('命令执行成功: '+ e)
          process.exit(e)
        })
      } catch (e) {
        log.error(e.message)
      }
    }
  }
}
module.exports = exec;
