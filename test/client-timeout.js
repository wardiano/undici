'use strict'

const { test } = require('tap')
const { Client, errors } = require('..')
const { createServer } = require('http')
const { Readable } = require('stream')
const FakeTimers = require('@sinonjs/fake-timers')

test('refresh timeout on pause', (t) => {
  t.plan(1)

  const server = createServer((req, res) => {
    res.flushHeaders()
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`, {
      bodyTimeout: 500
    })
    t.teardown(client.destroy.bind(client))

    client.dispatch({
      path: '/',
      method: 'GET'
    }, {
      onConnect () {
      },
      onHeaders (statusCode, headers, resume) {
        setTimeout(() => {
          resume()
        }, 1000)
        return false
      },
      onData () {

      },
      onComplete () {

      },
      onError (err) {
        t.ok(err instanceof errors.BodyTimeoutError)
      }
    })
  })
})

test('start headers timeout after request body', (t) => {
  t.plan(2)

  const clock = FakeTimers.install()
  t.teardown(clock.uninstall.bind(clock))

  const server = createServer((req, res) => {
  })
  t.teardown(server.close.bind(server))

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`, {
      bodyTimeout: 0,
      headersTimeout: 100
    })
    t.teardown(client.destroy.bind(client))

    const body = new Readable({ read () {} })
    client.dispatch({
      path: '/',
      body,
      method: 'GET'
    }, {
      onConnect () {
        clock.tick(200)
        queueMicrotask(() => {
          body.push(null)
          body.on('end', () => {
            clock.tick(200)
          })
        })
      },
      onHeaders (statusCode, headers, resume) {
      },
      onData () {

      },
      onComplete () {

      },
      onError (err) {
        t.equal(body.readableEnded, true)
        t.ok(err instanceof errors.HeadersTimeoutError)
      }
    })
  })
})
