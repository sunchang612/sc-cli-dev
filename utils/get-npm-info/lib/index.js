'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo (npmName, registry) {
  if (!npmName) return null
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  console.log('url --->', npmInfoUrl)
  return axios.get(npmInfoUrl).then(response => {
    if (response.status === 200) {
      return response.data
    }
    return null
  }).catch((e) => {
    new Error(e)
  })
}

// 判断使用那个源地址
function getDefaultRegistry (isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org/' : 'https://registry.npm.taobao.org/'
}

// 获取所有版本号
async function getNpmVersions (npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  }
  return null
}

// 获取所有满足条件的版本号


// 获取最新的 npm 版本号
async function getNpmLatestVersion (npmName, registry) {
  let version = await getNpmVersions(npmName, registry)
  if (version) {
    return version.sort((a, b) => semver.gt(b, a))[0]
  }
  return null
}

module.exports = {
  getNpmVersions,
  getDefaultRegistry,
  getNpmLatestVersion
}
