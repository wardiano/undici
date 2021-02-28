const HTTPParser = require('../node/http-parser')
const { parentPort, workerData } = require('worker_threads')

const nodeVersions = process.version.split('.')
const nodeMajorVersion = parseInt(nodeVersions[0].slice(1))
const nodeMinorVersion = parseInt(nodeVersions[1])
const insecureHTTPParser = process.execArgv.includes('--insecure-http-parser')

let parser

/* istanbul ignore next */
if (nodeMajorVersion === 12 && nodeMinorVersion < 19) {
  parser = new HTTPParser()
  parser.initialize(
    HTTPParser.RESPONSE,
    {},
    0
  )
} else if (nodeMajorVersion === 12 && nodeMinorVersion >= 19) {
  parser = new HTTPParser()
  parser.initialize(
    HTTPParser.RESPONSE,
    {},
    workerData.maxHeaderSize || 0,
    0
  )
} else if (nodeMajorVersion > 12) {
  parser = new HTTPParser()
  parser.initialize(
    HTTPParser.RESPONSE,
    {},
    workerData.maxHeaderSize || 0,
    insecureHTTPParser,
    0
  )
} else {
  parser = new HTTPParser(HTTPParser.RESPONSE, false)
}

parser[HTTPParser.kOnHeaders] = function (rawHeaders) {
  parentPort.postMessage([
    HTTPParser.kOnHeaders,
    rawHeaders
  ])
}

parser[HTTPParser.kOnHeadersComplete] = function (versionMajor, versionMinor, rawHeaders, method,
  url, statusCode, statusMessage, upgrade, shouldKeepAlive) {
  parentPort.postMessage([
    HTTPParser.kOnHeadersComplete,
    rawHeaders,
    parseInt(statusCode),
    upgrade ? 1 : 0,
    shouldKeepAlive ? 1 : 0
  ])
  return upgrade ? 2 : statusCode < 200 ? 1 : 0
}

parser[HTTPParser.kOnBody] = function (chunk, offset, length) {
  parentPort.postMessage([
    HTTPParser.kOnBody,
    chunk.slice(offset, length)
  ])
}

parser[HTTPParser.kOnMessageComplete] = function () {
  parentPort.postMessage([
    HTTPParser.kOnMessageComplete
  ])
}

parentPort.on('message', buf => {
  parser.execute(buf)
})
