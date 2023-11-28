import { describe, expect, test } from '@jest/globals'
import { Source } from '../src/main'
import { BookSource } from '../src/types'
import s from './test-sources/1.json'

describe('run test', () => {
  test.skip('test source search', async () => {
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.search(source.ruleSearch.checkKeyWord || '我的')
    console.log(JSON.stringify(result, null, 2))
  }, 60_000)

  test('test source book info', async () => {
    const url = 'https://m.douhuawenxue.com/novel-275010' 
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.bookInfo(url)
    console.log(JSON.stringify(result, null, 2))
  }, 60_000)


})
