import { describe, expect, test } from '@jest/globals'
import { Source } from '../src/main'
import { BookSource } from '../src/types'
import s from './test-sources/2.json'

describe('run test', () => {
  test.skip('test source search', async () => {
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.search(source.ruleSearch.checkKeyWord || '我的')
    console.log(JSON.stringify(result, null, 2))
  }, 60_000)

  test.skip('test source book info', async () => {
    const url = '/shu_102752.html'
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookInfo(url)
    console.log(JSON.stringify(result, null, 2))
  }, 60_000)

  test.skip('test source book info', async () => {
    const url = '/102752/'
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookToc(url)
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)

  test('test source book content', async () => {
    // const url = '/102752/12317344.html'
    const url = 'https://m.wfxs.tw/xs-1695036/du-150829910/'
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookContent(url, 'hello world')
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)
})
