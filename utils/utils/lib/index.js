'use strict';

function isObject (o) {
  return !Object.prototype.toString.call(o) === '[object Object]'
}

// 获取最新的版本号

module.exports = {
  isObject
};
