'use strict';


const fs = require('fs')
const path = require('path')
const Command = require('@sc-cli-dev/command')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const log = require('@sc-cli-dev/log')
const semver = require('semver')
const glob = require('glob')
const ejs = require('ejs')
const userHome = require('user-home')
const Package = require('@sc-cli-dev/package')
const { spinnerStart, execAsync } = require('@sc-cli-dev/utils')

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const TYPE_PROJECT = 'type_project'
const TYPE_COMPONENT = 'type_component'

const TEMPLATE_OPTION = [
  {
    value: 'sc-vue-template',
    name: 'sc-vue-template',
    version: '1.0.2',
    type: 'normal',
    install: 'npm install',
    start: 'npm run serve'
  }
]
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    this.template = TEMPLATE_OPTION
    this.templateNpm = null
    console.log('重置的 init', this.projectName, this.force)
  }

  async exec() {
    try {
      // 准备阶段
      const projectInfo = await this.prepare()
      if (projectInfo) {
        this.projectInfo = projectInfo
        // 下载模板
        await this.downloadTemplate()

        // 安装模板
        await this.installTemplate()
      }
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
      const spinner = spinnerStart('正在下载模板')
      try {
        await templateNpm.install()
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        // 判断模板是否存在
        if (await templateNpm.exists()) {
          log.success('下载模板成功')
          // 保存模板信息，用于后续拷贝模板用
          this.templateNpm = templateNpm
        }
      }

    } else {
      const spinner = spinnerStart('正在更新模板')
      try {
        await templateNpm.update()
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('更新模板成功')
          this.templateNpm = templateNpm
        }
      }
    }
  }

  // 下载模板
  async installTemplate () {
    console.log(this.templateInfo)
    if (this.templateInfo) {
      // 判断模板类型是否存在
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }

      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        this.installCustomTemplate()
      } else {
        throw new Error('无法识别项目模板类型！');
      }
    } else {
      throw new Error('模板不存在！');
    }
  }

  // 安装标准的模板
  async installNormalTemplate() {
    let spinner = spinnerStart('正在安装模板...');
    try {
      // 拿到缓存的路径
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      // 拿到当前目录
      const targetPath = process.cwd()
      // ensureDirSync 能确保当前目录是存在的，如果没有会自动去创建
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
    } catch (e) {
      throw e
    } finally {
      spinner.stop(true)
      log.success('模板安装成功')
    }
    log.info('开始安装依赖')
    // 忽略文件
    const ignore = ['node_modules/**', 'public/**']
    await this.ejsRender(ignore)

    // 依赖安装
    const { install, start } = this.templateInfo
    let installRes = null
    if (install) {
      // 取出命令，转换成 spawn 需要的格式（后面是数组）
      const installCmd = install.split(' ')
      const cmd = installCmd[0]
      const args = installCmd.slice(1)
      installRes = await execAsync(cmd, args, {
        stdio: 'inherit', // 表示所有 log 都打印在主进程
        cwd: process.cwd()
      })
      console.log('installRes --->', installRes)
      if (installRes !== 0) {
        throw new Error('依赖安装失败！')
      }
      // 执行启动命令
      if (start) {
        const startCmd = start.split(' ')
        const cmd = startCmd[0]
        const args = startCmd.slice(1)
        await execAsync(cmd, args, {
          stdio: 'inherit', // 表示所有 log 都打印在主进程
          cwd: process.cwd()
        })
      }
    }
  }

  async ejsRender (ignore) {
    const dir = process.cwd()
    const projectInfo = this.projectInfo;
    console.log('ejs ---------->', projectInfo)
    return new Promise((resolve, reject) => {
      // 拿到文件目录
      glob('**', {
          cwd: dir,
          ignore,
          nodir: true // 不包含文件加
      }, function (err, files) {
        if (err) {
          reject(err)
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              if (err) {
                reject1(err)
              } else {
                // 因为 ejs 拿到的结果是字符串，所以需要重新写入文件
                fse.writeFileSync(filePath, result);
                resolve1(result)
              }
            })
          })
        })).then(() => {
          resolve()
        }).catch((err) => {
          reject(err)
        })
      })
    })
  }

  // 安装自定义模板
  installCustomTemplate () {

  }

  async prepare () {
    // 获取文件目录
    const localPath = process.cwd()
    // 1. 判断当前目录是否为空
    const isCwdEmpty = this.isCwdEmpty(localPath)
    // 拿到当前目录的另一种方式
    // console.log(path.resolve('.'))
    if (!isCwdEmpty) {
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
          fse.emptyDirSync(localPath)
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
    let projectInfo = {}
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
      projectInfo = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称',
          default: this.projectName,
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
          default: '1.0.2',
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
    } else if (type === TYPE_COMPONENT) {

    }

    // 4. 获取项目的基本信息
    // 生成 projectName
    if (projectInfo.projectName) {
      // kebab-case 驼峰转为 -
      projectInfo.name = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }

    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }

    console.log('result ---->', projectInfo)
    return projectInfo
  }

  isCwdEmpty(localPath) {
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
