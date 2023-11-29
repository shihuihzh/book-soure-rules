import { describe, expect, test } from '@jest/globals'
import { analyzeDomStepV2, analyzeUrl } from '../src/utils'

describe('run test', () => {

  test.skip('test analyzeUrl', () => {
    const result = analyzeUrl('http://baidu.com/{{page + 1}}/{{key}},{"method": "get"}', {
      key: 'hello',
    })

    expect(result[0]).toBe('http://baidu.com/2/hello')
    expect(result[1].method).toBe('get')
  })

  test('test analyzeDomRuleV2 2', () => {
    const result = analyzeDomStepV2('text##aaa##bb')
    console.log(result);
  })

  test('test analyzeDomRuleV2', () => {

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
