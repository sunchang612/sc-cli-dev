'use strict';


const fs = require('fs')
const Command = require('@sc-cli-dev/command')
const inquirer = require('inquirer')
const fes = require('fs-extra')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    console.log('重置的 init', this.projectName, this.force)
  }

  async exec() {
    try {
      // 准备阶段
      await this.prepare()
      // 下载模板
      // 安装模板
    } catch (e) {
      console.error(e)
    }
  }

  async prepare () {
    // 1. 判断当前目录是否为空
    const res = this.isCwdEmpty()
    console.log('当前文件是否为空', res)
    if (!res) {
      console.log('force ------>', this.force)
      let ifContinue = false
      if(!this.force) {
        ifContinue = await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          message: '当前文件夹不为空，是否继续创建项目？'
        })
        // 选择否不往下执行
        if (!ifContinue) return
      }

      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前的目录？'
        })
        // 删除目录
        if(confirmDelete) {
          fes.emptyDirSync(confirmDelete)
        }
        console.log(confirmDelete)
      }
    }
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
    // throw new Error('出错了')
  }

  isCwdEmpty() {
    // 获取文件目录
    const localPath = process.cwd()
    // 拿到当前目录的另一种方式
    // console.log(path.resolve('.'))
    // 拿到文件下的内容
    let fileList = fs.readdirSync(localPath)
    // 过滤掉一些文件
    fileList = fileList.filter(file => (
      !file.startsWith('.') && !['node_modules'].includes(file)
    ))
    return !fileList || !fileList.length
  }
}
function init(argv) {
  console.log('init ---argv ---->', argv)
  return new InitCommand(argv)
}


module.exports = init

module.exports.InitCommand = InitCommand;
