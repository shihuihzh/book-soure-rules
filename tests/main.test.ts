import { describe, expect, test } from '@jest/globals'
import { Source } from '../src/main'
import { BookSource } from '../src/types'
import s from './test-sources/2.json'
import { analyzeUrl } from '../src/utils'
import simpleEval from 'simple-eval'

describe('run test', () => {
  test('test source', async () => {
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.search(source.ruleSearch.checkKeyWord || '我的')
    console.log(JSON.stringify(result, null, 2))
  }, 60_000)

  // test.skip('test simple_eval', () => {
  //   const result = simpleEval('process.env')
  //   console.log(result)
  // })

  test.skip('test analyzeUrl', () => {
    const result = analyzeUrl('http://baidu.com/{{page + 1}}/{{key}},{"method": "get"}', {
      key: 'hello',
    })

    expect(result[0]).toBe('http://baidu.com/2/hello')
    expect(result[1].method).toBe('get')
  })
})
