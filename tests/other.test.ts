import { describe, expect, test } from '@jest/globals'
import { runJs } from '../src/utils'
import encode from 'urlencode'

describe('run test', () => {
  test.skip('test eval', async () => {
    const a = runJs(`bbb`, {a: 'string', bbb: [1,2,3,4] })
    console.log(a)
  }, 60_000)

  test('test encode', async () => {
    const a = 'a=中国&b=中文'
    console.log(encode(a, 'gbk'))
  }, 60_000)
})
