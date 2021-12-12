'use strict';

const { isObject } = require('@sc-cli-dev/utils')
const pkgDir = require('pkg-dir').sync
const path = require('path')
const fsExera = require('fs-extra')
const formatPath = require('@sc-cli-dev/format-path')
const npminstall = require('npminstall')
const pathExists = require('path-exists').sync
const { getNpmLatestVersion } = require('@sc-cli-dev/get-npm-info')

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('请传入参数')
    }
    console.log('options ------>', options)
    if (!isObject(options)) {
      throw new Error('参数必须是object类型')
    }
    // package 路径
    this.targetPath = options.targetPath
    // 缓存 package 的路径
    this.storeDir = options.storeDir

    this.packageName = options.packageName

    console.log('package name ---->', this.packageName)
    this.packageVersion = options.packageVersion
    console.log('packages --', options)
    // 缓存路径的前缀  / 替换成_
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  async prepare () {
    // 缓存目录不存在时
    if (this.storeDir && !pathExists(this.storeDir)) {
      // 创建路径
      fsExera.mkdirpSync(this.storeDir)
    }
    // 获取最新的版本号
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  // 获取本地缓存路径
  get cacheFilePath () {
    // 例如 _vue@2.6.14@vue
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }

  // 判断当前 package 是否存在
  async exists () {
    if (this.storeDir) {
      await this.prepare()
      return pathExists(this.cacheFilePath)
    }
  }
  // 安装
  install (version = this.packageVersion) {
    return npminstall({
      pkgs: [
        { name: this.packageName, version },
      ],
      root: this.targetPath,
      registry: 'https://registry.npmjs.org',
      storeDir: this.storeDir,
    });
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
  }

  // 更新
  async update () {
    await this.prepare()
    // 获取最新的版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // 找到缓存中最新版本的路径
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    // 不存在就安装新的版本
    if(!pathExists(latestFilePath)) {
      await this.install(latestPackageVersion)
    }
    // 更新版本号
    this.packageVersion = latestPackageVersion
  }
  // 获取入口文件路径
  getRootFilePath () {
    function _getRootFile (targetPath) {
      // 1. 获取 package.json 所在目录 pkg-dir
      const dir = pkgDir(targetPath)
      if (dir) {
        // 2. 读取 package.json
        const pkgFile = require(path.resolve(dir, 'package.json'))
        // 3. 寻找 main
        if (pkgFile && pkgFile.main) {
          // 4. 路径兼容（操作系统的兼容）
          return formatPath(path.resolve(dir, pkgFile.main))
        }

      }
      return null
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }

  }
}

module.exports = Package;
