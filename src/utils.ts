import { UrlOption } from './types'
import simpleEval from 'simple-eval'

export function debug(log: string) {
  console.log(log)
}

function getTextNodesIn(elem: Node): Node[] {
  let textNodes: Node[] = []
  if (elem) {
    for (let nodes = elem.childNodes, i = nodes.length; i--; ) {
      let node = nodes[i],
        nodeType = node.nodeType
      if (nodeType == 3) {
        textNodes.push(node)
      } else if (nodeType == 1 || nodeType == 9 || nodeType == 11) {
        textNodes = textNodes.concat(getTextNodesIn(node))
      }
    }
  }
  return textNodes
}

export function queryTextParentElemByText(elem: Node, text: string): Node[] {
  const textNodes = getTextNodesIn(elem)
  return textNodes
    .filter((t) => t.textContent === text)
    .map((e) => e.parentElement)
    .filter((e) => e !== null) as Node[]
}

export const analyzeCssStep = (step: string) => {
  let hasReplace = step.includes('##')
  let replaceRegex = ''
  let replaceTargetStr = ''
  let name = ''

  if (hasReplace) {
    const replaceInfo = step.split('##')
    replaceRegex = replaceInfo[1]
    replaceTargetStr = replaceInfo[2] || ''
    name = replaceInfo[0]
  } else {
    name = step
  }

  return {
    name,
    replaceRegex,
    replaceTargetStr,
  }
}

export const analyzeDomStepV2 = (step: string) => {
  const ruleRegex = /^-?(tag|class|id|text)\.(([^.\[!]+)\.?($|[!\[\]\-\d,:]+$))/
  const valueRegex = /^(text|textNodes|ownText|href|src|data-src|html|all|content|value)(##.*)?$/
  const extractIndexRegex = /(?=([.\[!][!\[\]\-\d,:]+)$)/

  let tokens: string[] = []
  if (!valueRegex.test(step)) {
    const match = step.match(ruleRegex)
    if (match) {
      // full rule
      tokens = [match[1], match[3], match[4]]
    } else {
      // simple rule or just index for children
      const indexMatch = step.match(extractIndexRegex)
      if (indexMatch) {
        if (indexMatch.index === 0) {
          // children
          tokens = ['children', '', indexMatch[1]]
        } else {
          // css
          tokens = [step.startsWith('children') ? 'children' : 'css', step.substring(0, indexMatch.index), indexMatch[1]]
        }
      } else {
        tokens = [step.startsWith('children') ? 'children' : 'css', step]
      }
    }
  } else {
    // get value
    const replaceInfo = step.split('##')
    tokens = [replaceInfo[0]]
  }

  let [type, selector, posistion] = tokens
  let reverse = step.startsWith('-')
  let excludeIndex: number[] = []
  let includeIndex: number[] = []
  let rangeStart: number = 0
  let rangeEnd: number = 0
  let rangeStep: number = 1
  let isExclude = false
  let isRange = false
  let replaceRegex = ''
  let replaceTargetStr = ''

  debug(`tokens: ${tokens}`)

  if (posistion) {
    isExclude = posistion.includes('!')
    const posistionOrArray = posistion.replace(/[\.!\[\]]/g, '') // clean it
    if (!!~posistion.search(/(?:\[|:|,)/)) {
      // is range
      if (posistionOrArray.includes(':')) {
        // range
        isRange = true
        const [start, end, step] = posistionOrArray.split(':')
        rangeStart = parseInt(start || '0')
        rangeEnd = parseInt(end || '-1')
        rangeStep = parseInt(step || '1')
      } else {
        // indexes
        const indexes = posistionOrArray.split(',')
        indexes.forEach((index) => {
          if (isExclude) {
            excludeIndex.push(parseInt(index))
          } else {
            includeIndex.push(parseInt(index))
          }
        })
      }
    } else {
      if (isExclude) {
        excludeIndex.push(parseInt(posistionOrArray))
      } else {
        includeIndex.push(parseInt(posistionOrArray))
      }
    }
  }

  if (step.includes('##')) {
    const replaceInfo = step.split('##')
    replaceRegex = replaceInfo[1]
    replaceTargetStr = replaceInfo[2] || ''
  }

  return {
    reverse,
    type,
    selector,
    isExclude,
    isRange,
    rangeStart,
    rangeEnd,
    rangeStep,
    includeIndex,
    excludeIndex,
    replaceRegex,
    replaceTargetStr,
  }
}
export function makeIndexesNonNegative(size: number, indexArray: number[]) {
  // size 10
  // -1 => 9
  // -10 => 0
  // -11 => -1 ? let it => 0
  // >= 10 let it to 9
  return indexArray.map((i) => (i < 0 ? (size + i > 0 ? size + i : 0) : i >= size ? size - 1 : i))
}

function generateFullIndexes(size: number, reverse: boolean) {
  const ans = []
  for (let i = 0; i < size; i++) {
    ans.push(i)
  }
  return reverse ? ans.reverse() : ans
}

export function makeIndexesFromRange(size: number, rangeStart: number, rangeEnd: number, rangeStep: number, isExclude: boolean) {
  let indexes: number[] = []
  let [pRangeStart, pRangeEnd] = makeIndexesNonNegative(size, [rangeStart, rangeEnd])
  const step = Math.abs(rangeStep)

  if (pRangeStart > pRangeEnd) {
    for (let i = pRangeStart; i >= pRangeEnd; i -= step) {
      indexes.push(i)
    }
  } else {
    for (let i = pRangeStart; i <= pRangeEnd; i += step) {
      indexes.push(i)
    }
  }

  if (isExclude) {
    const fullIndexes = generateFullIndexes(size, pRangeStart > pRangeEnd)
    indexes = fullIndexes.filter((i) => !indexes.includes(i))
  }

  return indexes
}

const evalCurryBraceExp = (code: string, context: Record<string, unknown>) => {
  // use regex extract data in `u` which warp with '{{}}'
  const match = code.match(/{{(.*?)}}/g)
  const target =
    match?.reduce((acc, cur) => {
      const evalResult = simpleEval(cur.slice(2, -2), context)
      return acc.replaceAll(cur, evalResult as string)
    }, code) || code

  return target
}

export const analyzeUrl = (url: string, context: Record<string, unknown>): [string, UrlOption] => {
  const commaIndex = url.indexOf(',')
  const originUrl = commaIndex !== -1 ? url.slice(0, commaIndex) : url
  const originOptions = commaIndex !== -1 ? url.slice(commaIndex + 1) : '{}'

  return [evalCurryBraceExp(originUrl, context), JSON.parse(evalCurryBraceExp(originOptions, context))]
}

export function arrayBufferToString(buffer: ArrayBuffer, encoding = 'utf-8') {
  const decoder = new TextDecoder(encoding)
  return decoder.decode(buffer)
}

export function arrayUniqueByKey(keyName: string, array: any[]) {
  const arrayUniqueByKey = [...new Map(array.map((item) => [item[keyName], item])).values()]
  return arrayUniqueByKey
}
