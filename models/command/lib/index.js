'use strict';
const semver = require('semver')
const colors = require('colors/safe')
const LOWEST_VERSION = '13.0.0'

class Command {
  constructor(argv) {
    console.log('执行了 command constructor', argv)
    if (!argv) {
      throw Error('参数不能为空')
    }
    if (!Array.isArray(argv)) {
      throw Error('参数必须是数组')
    }
    if (argv.length < 1) {
      throw Error('参数列表不能为空')
    }

    this._argv = argv
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => {
        this.checkNodeVersion()
      })
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())

      chain.catch((e) => {
        console.error(e.message)
      })
    })
    this.runner = runner
  }

  initArgs () {
    this._cmd = this._argv[this._argv.length - 2]
    this._argv = this._argv.slice(0, this._argv.length - 1)
    console.log('init ---->', this._argv, this._cmd)
  }
  checkNodeVersion () {
    // 当前的版本号
    console.log(process.version)
    const version = process.version
    if (!semver.gte(version, LOWEST_VERSION)) {
      throw new Error(colors.red(`需要安装 ${LOWEST_VERSION} 以上的node版本`))
    }
  }
  init() {
    throw new Error('init 必须实现')
  }
  exec() {
    throw new Error('exec 必须实现')
  }
}

function index() {
    // TODO
}

module.exports = Command;
