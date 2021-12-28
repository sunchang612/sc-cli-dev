'use strict';


const fs = require('fs')
const path = require('path')
const Command = require('@sc-cli-dev/command')
const inquirer = require('inquirer')
const fes = require('fs-extra')
const log = require('@sc-cli-dev/log')
const semver = require('semver')
const userHome = require('user-home')
const Package = require('@sc-cli-dev/package')

const TYPE_PROJECT = 'type_project'
const TYPE_COMPONENT = 'type_component'

const TEMPLATE_OPTION = [
  {
    value: 'sc-vue-template',
    name: 'sc-vue-template',
    version: '0.1.0'
  }
]
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    this.template = TEMPLATE_OPTION
    console.log('重置的 init', this.projectName, this.force)
  }

  async exec() {
    try {
      // 准备阶段
      const projectInfo = await this.prepare()
      // 下载模板
      if (projectInfo) {
        this.projectInfo = projectInfo

        await this.downloadTemplate()
      }
      // 安装模板
    } catch (e) {
      console.error(e)
    }
  }

  // 下载模板
  async downloadTemplate () {
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.name === projectTemplate)
    // 缓存的目录
    // 缓存的项目模板
    const targetPath = path.resolve(userHome, '.sc-cli-dev', 'template')
    const storeDir = path.resolve(userHome, '.sc-cli-dev', 'template', 'node_modules')
    const { name, version } = templateInfo
    this.templateInfo = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: name,
      packageVersion: version,
    })
    // 判断当前 npm 包是否存在
    if (!await templateNpm.exists()) {
      // 不存在去下载
      await templateNpm.install()
    } else {
      await templateNpm.update()
    }

    console.log('targetPath ----------->', templateNpm)
  }

  async prepare () {
    // 获取文件目录
    const localPath = process.cwd()
    // 1. 判断当前目录是否为空
    const isCwdEmpty = this.isCwdEmpty(localPath)
    // 拿到当前目录的另一种方式
    // console.log(path.resolve('.'))
    console.log('当前文件是否为空', localPath)
    if (!isCwdEmpty) {
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
          fes.emptyDirSync(localPath)
        }
        console.log(confirmDelete)
      }
    }
    return this.getProjectInfo()
    // throw new Error('出错了')
  }

  async getProjectInfo () {
    function isValidName (v) {
      return /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
    }
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [
        {
          name: '项目',
          value: TYPE_PROJECT
        },
        {
          name: '组件',
          value: TYPE_COMPONENT
        }
      ]
    })
    console.error()
    if (type === TYPE_PROJECT) {
      const result = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称',
          default: '',
          validate: function (v) {
            const done = this.async()
            setTimeout(() => {
              if (!isValidName(v)) {
                done('请输入合法的项目名')
                return
              }
              done(null, true)
            }, 0)
          },
          filter: function (v) {
            return v
          }
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入版本号',
          default: '1.0.0',
          validate: function (v) {
            const done = this.async()
            setTimeout(() => {
              if (!(!!semver.valid(v))) {
                done('请输入合法的项目名')
                return
              }
              done(null, true)
            }, 0)
          },
          filter: function(v) {
            if (!!semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请选择模板',
          choices: TEMPLATE_OPTION
        }
      ])
      console.log('result ---->', result)
      return result
    } else if (type === TYPE_COMPONENT) {

    }

    // 4. 获取项目的基本信息
  }

  isCwdEmpty(localPath) {
    console.log('localPath --->', localPath)
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
