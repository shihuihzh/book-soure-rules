import { describe, expect, test } from '@jest/globals'
import { Source } from '../src/main'
import { BookSource } from '../src/types'
import s from './test-sources/2.json'
import { analyzeDomStep, analyzeDomStepV2, analyzeUrl } from '../src/utils'
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

  test.skip('test analyzeDomRuleV2', () => {
    // const result = analyzeDomStepV2('.infotype p[!1,2,3]')
    // const result = analyzeDomStepV2('.infotype p.!-1')
    // const result = analyzeDomStepV2('.infotype p')
    // const result = analyzeDomStepV2('children')
    // const result = analyzeDomStepV2('class.odd.1,2,3')
    // const result = analyzeDomStepV2('class.odd[!1,2,3]')
    //

    function checkRule(result: any, expectObj: any) {
      for (const k of Object.keys(expectObj)) {
        expect(JSON.stringify(result[k])).toBe(JSON.stringify(expectObj[k]))
      }
    }

    // normal
    checkRule(analyzeDomStepV2('tag.div'), {
      type: 'tag',
      selector: 'div',
    })

    checkRule(analyzeDomStepV2('id.div.1'), {
      type: 'id',
      selector: 'div',
      includeIndex: [1],
    })

    checkRule(analyzeDomStepV2('class.div.!1'), {
      type: 'class',
      selector: 'div',
      excludeIndex: [1],
    })

    checkRule(analyzeDomStepV2('tag.div[1,2,3]'), {
      type: 'tag',
      selector: 'div',
      includeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('tag.div[!1,2,3]'), {
      type: 'tag',
      selector: 'div',
      excludeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('tag.div[1:2:3]'), {
      type: 'tag',
      selector: 'div',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('tag.div[1:2]'), {
      type: 'tag',
      selector: 'div',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 1,
    })

    checkRule(analyzeDomStepV2('tag.div[:2:3]'), {
      type: 'tag',
      selector: 'div',
      isRange: true,
      rangeStart: 0,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('tag.div[1::3]'), {
      type: 'tag',
      selector: 'div',
      isRange: true,
      rangeStart: 1,
      rangeEnd: -1,
      rangeStep: 3,
    })

    // simple
    checkRule(analyzeDomStepV2('div .book-list'), {
      type: 'css',
      selector: 'div .book-list',
    })

    checkRule(analyzeDomStepV2('div .book-list.1'), {
      type: 'css',
      selector: 'div .book-list',
      includeIndex: [1],
    })

    checkRule(analyzeDomStepV2('div .book-list.!1'), {
      type: 'css',
      selector: 'div .book-list',
      excludeIndex: [1],
    })

    checkRule(analyzeDomStepV2('div .book-list[1,2,3]'), {
      type: 'css',
      selector: 'div .book-list',
      includeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('div .book-list[!1,2,3]'), {
      type: 'css',
      selector: 'div .book-list',
      excludeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('div .book-list[1:2:3]'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('div .book-list[1:2:1]'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 1,
    })

    checkRule(analyzeDomStepV2('div .book-list[:2:3]'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 0,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('div .book-list[1::3]'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: -1,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('div .book-list.1,2,3'), {
      type: 'css',
      selector: 'div .book-list',
      includeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('div .book-list.!1,2,3'), {
      type: 'css',
      selector: 'div .book-list',
      excludeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('div .book-list.1:2:3'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('div .book-list.1:2:1'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 1,
    })

    checkRule(analyzeDomStepV2('div .book-list.:2:3'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 0,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('div .book-list.1::3'), {
      type: 'css',
      selector: 'div .book-list',
      isRange: true,
      rangeStart: 1,
      rangeEnd: -1,
      rangeStep: 3,
    })

    // children
    checkRule(analyzeDomStepV2('children'), {
      type: 'children',
    })

    checkRule(analyzeDomStepV2('children.1'), {
      type: 'children',
      includeIndex: [1],
    })

    checkRule(analyzeDomStepV2('.1'), {
      type: 'children',
      includeIndex: [1],
    })

    checkRule(analyzeDomStepV2('.!1'), {
      type: 'children',
      excludeIndex: [1],
    })

    checkRule(analyzeDomStepV2('[1,2,3]'), {
      type: 'children',
      includeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('[!1,2,3]'), {
      type: 'children',
      excludeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('[1:2:3]'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('[1:2:1]'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 1,
    })

    checkRule(analyzeDomStepV2('[:2:3]'), {
      type: 'children',
      isRange: true,
      rangeStart: 0,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('[1::3]'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: -1,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('.1,2,3'), {
      type: 'children',
      includeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('.!1,2,3'), {
      type: 'children',
      excludeIndex: [1, 2, 3],
    })

    checkRule(analyzeDomStepV2('.1:2:3'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('.1:2:1'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: 2,
      rangeStep: 1,
    })

    checkRule(analyzeDomStepV2('.:2:3'), {
      type: 'children',
      isRange: true,
      rangeStart: 0,
      rangeEnd: 2,
      rangeStep: 3,
    })

    checkRule(analyzeDomStepV2('.1::3'), {
      type: 'children',
      isRange: true,
      rangeStart: 1,
      rangeEnd: -1,
      rangeStep: 3,
    })

    // value
    checkRule(analyzeDomStepV2('text'), {
      type: 'text',
    })

    checkRule(analyzeDomStepV2('text##aa##bb'), {
      type: 'text',
      replaceRegex: 'aa',
      replaceTargetStr: 'bb',
    })
  })
})
