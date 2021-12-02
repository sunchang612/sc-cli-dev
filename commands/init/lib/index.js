'use strict';



const Command = require('@sc-cli-dev/command')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    console.log('重置的 init', this.projectName, this.force)
  }

  exec() {
    console.log('exec')
  }
}
function init(argv) {
  return new InitCommand(argv)
}


module.exports = init

module.exports.InitCommand = InitCommand;
