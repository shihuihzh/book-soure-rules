import { describe, expect, test } from '@jest/globals'
import { Source } from '../src/main'
import { BookSource } from '../src/types'
import s from './test-sources/1.json'
import s3 from './test-sources/3.json'
import s4 from './test-sources/4.json'

describe('run test', () => {
  test.skip('test source search', async () => {
    const source = s3 as unknown as BookSource
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

  test.skip('test source book toc', async () => {
    const url = '/265853/'
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookToc(url)
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)

  test.skip('test source book toc (js)', async () => {
    const url = 'https://www.yipinxia.co/25/25902_1/'
    const source = s3 as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookToc(url)
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)

  test.skip('test source book content', async () => {
    const url = '/102752/103131415.html'
    const source = s as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.getBookContent(url, 'hello world')
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)

  test('test webview search ', async () => {
    const source = s4 as unknown as BookSource
    const bookSource = new Source(source)
    const result = await bookSource.search(source.ruleSearch.checkKeyWord || '我的')
    console.log(JSON.stringify(result, null, 2))
  }, 600_000)
})
