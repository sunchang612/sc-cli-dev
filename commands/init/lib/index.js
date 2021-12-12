'use strict';



const Command = require('@sc-cli-dev/command')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    console.log('重置的 init', this.projectName, this.force)
  }

  exec() {
    try {
      this.prepare()
    } catch (e) {
      console.error(e)
    }
    // 准备阶段
    // 下载模板
    // 安装模板
    console.log('exec')
  }

  prepare () {
    throw new Error('出错了')
  }
}
function init(argv) {
  return new InitCommand(argv)
}


module.exports = init

module.exports.InitCommand = InitCommand;
