import { JSDOM } from 'jsdom'
import xpath from 'xpath'
import jp from 'jsonpath'
import { debug, makeIndexesFromRange, makeIndexesNonNegative, analyzeCssStep, analyzeDomStepV2, queryTextParentElemByText, runJs } from './utils'
import { JsContext } from './types'

// dom
const queryBySelector = (targetElements: Array<Node>, selector: string, reverse: boolean, filter: (e: Array<Node>) => Array<Node>) => {
  let es: Node[] = []
  try {
    es = targetElements.flatMap((e) => filter(Array.from((e as Element).querySelectorAll(selector))))
  } catch (e: any) {
    debug(e.message)
  }

  return reverse ? es.reverse() : es
}

const queryByText = (targetElements: Array<Node>, selector: string, reverse: boolean, filter: (e: Array<Node>) => Array<Node>) => {
  let es: Node[] = []
  try {
    es = targetElements.flatMap((e) => filter(queryTextParentElemByText(e, selector)))
  } catch (e: any) {
    debug(e.message)
  }

  return reverse ? es.reverse() : es
}

const allChildren = (targetElements: Array<Node>, reverse: boolean, filter: (e: Array<Node>) => Array<Node>) => {
  let es: Node[] = []
  try {
    es = targetElements.flatMap((e) => filter(Array.from(e.childNodes))) as Node[]
  } catch (e: any) {
    debug(e.message)
  }

  return reverse ? es.reverse() : es
}

// handle rule
export function extractDataByJSONRule(json: string, rule: string): Array<string | string[]> {
  debug(`all JSON rule ${rule}`)
  const r = rule.replace(/@json:/gi, '').replace(/\$\./gi, '')
  return jp.query(JSON.parse(json), `$.${r}`)
}

export function extractDataByXPath(html: string, rule: string, jsCtx?: JsContext): Array<string | string[]> {
  debug(`all XPath rule ${rule}`)
  const r = rule.replace(/@XPath:/gi, '').replace(/\/\//gi, '')
  const dom = new JSDOM(html)
  const doc = dom.window.document
  const evalu: any = (xpath as any).parse(`//${r}`)
  const nodes = evalu.select({ node: doc, isHtml: true })
  return (nodes as []).map((n: any) => n.textContent)
}

export function extractDataByCSSRule(html: string, rule: string): Array<string | string[]> {
  const dom = new JSDOM(html)
  const doc = dom.window.document
  const steps = rule.replace(/@css:/gi, '').split('@')
  const emptyTextNode = doc.createTextNode('')
  let targetElements: Array<Node> | Array<Node[]> = [doc]
  let lastReplaceRegex,
    lastReplaceTargetStr: string = ''

  debug(`all CSS rule steps: ${steps}`)

  for (let i = 0; i < steps.length; i++) {
    const { name, replaceRegex, replaceTargetStr } = analyzeCssStep(steps[i])
    debug(`run CSS rule step:{${steps[i]}} selector: ${name}`)

    lastReplaceRegex = replaceRegex
    lastReplaceTargetStr = replaceTargetStr

    switch (name) {
      // below are result case
      case 'textnodes':
        targetElements = (targetElements as Node[]).map((e) => Array.from((e as Element).childNodes).filter((c) => c.nodeType === 3))
        break

      case 'owntext':
        targetElements = (targetElements as Node[]).map((e) => Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3))

      case 'href':
      case 'src':
        targetElements = (targetElements as Node[]).map((e) => (e as Element).attributes.getNamedItem(name) || emptyTextNode)
        break
      case 'html':
        targetElements = (targetElements as Node[]).map((e) => doc.createTextNode((e as Element).innerHTML || ''))
        break
      case 'text':
      case 'content':
      case 'all':
        // what's all means.
        break
      default:
        // run selector
        targetElements = queryBySelector(targetElements as Node[], name, false, (e) => e)
        break
    }
  }

  // TODO: fix it
  return makeResult(targetElements as Array<Node>, lastReplaceRegex, lastReplaceTargetStr)
}

export function extractDataByDomRule(html: string, rule: string, listRuleStep?: string, jsCtx?: JsContext): Array<string> {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const steps = rule.split('@').filter((e) => !!e)
  const emptyTextNode = doc.createTextNode('')
  debug(`all DOM rule steps: ${steps.join(', ')}`)

  function runRule(step: string, targetElements: Array<Node>) {
    const stepAfterAnalyze = analyzeDomStepV2(step)
    const {
      type,
      selector,
      includeIndex,
      excludeIndex,
      reverse,
      replaceRegex,
      replaceTargetStr,
      isExclude,
      isRange,
      rangeStart,
      rangeEnd,
      rangeStep,
    } = stepAfterAnalyze

    let js = ''

    const filterElements = (ie: Array<Node>) => {
      // include or exclude elements
      if (includeIndex.length > 0 || excludeIndex.length > 0 || isRange) {
        const size = ie.length

        if (isRange) {
          let rangeIncludeIndex = makeIndexesFromRange(size, rangeStart, rangeEnd, rangeStep, isExclude)
          ie = rangeIncludeIndex.map((i) => (ie as Node[])[i])
        } else {
          const nonNegativeIncludeIndex = makeIndexesNonNegative(size, includeIndex)
          const nonNegativeExcludeIndex = makeIndexesNonNegative(size, excludeIndex)
          ie = (ie as Node[]).filter((_, i) => {
            if (nonNegativeIncludeIndex.length > 0) {
              return nonNegativeIncludeIndex.includes(i)
            }

            if (nonNegativeExcludeIndex.includes(i)) {
              return false
            }

            return true
          })
        }
      }

      return ie
    }

    debug(`run DOM rule step: ${JSON.stringify(stepAfterAnalyze)}`)

    switch (type.toLowerCase()) {
      case 'class':
        targetElements = queryBySelector(targetElements as Array<Node>, `.${selector}`, reverse, filterElements)
        break
      case 'id':
        targetElements = queryBySelector(targetElements as Array<Node>, `#${selector}`, reverse, filterElements)
        break
      case 'css':
      case 'tag':
        targetElements = queryBySelector(targetElements as Array<Node>, selector, reverse, filterElements)
        break
      case 'children':
        targetElements = allChildren(targetElements as Array<Node>, reverse, filterElements)
        break
      case 'text':
        if (selector) {
          // text also can be a selector
          targetElements = queryByText(targetElements as Array<Node>, selector, reverse, filterElements)
        }
        break

      // below are result case
      case 'textnodes':
      case 'owntext':
        targetElements = (targetElements as Node[]).map((e) =>
          doc.createTextNode(
            Array.from((e as HTMLElement).childNodes)
              .filter((c) => c.nodeType === 3)
              .map((c) => c.textContent)
              .join('')
          )
        )
        break

      case 'value':
      case 'href':
      case 'src':
      case 'data-src':
      case 'content':
        targetElements = (targetElements as Node[]).map((e) => (e as Element).attributes.getNamedItem(type) || emptyTextNode)
        break
      case 'html':
        targetElements = (targetElements as Node[]).map((e) => doc.createTextNode((e as Element).innerHTML || ''))
        break
      case 'all':
        // what's all means.
        break

      case 'js':
        js = selector
    }

    return {
      targetElements,
      replaceRegex,
      replaceTargetStr,
      js,
    }
  }

  let rootElements: Array<Node> = !listRuleStep ? [doc] : runRule(listRuleStep, [doc]).targetElements
  const result = rootElements.map((e) => {
    let resultElements: Array<Node> = [e]
    let lastReplaceRegex,
      lastReplaceTargetStr,
      js = ''
    for (let i = 0; i < steps.length; i++) {
      const result = runRule(steps[i], resultElements)
      lastReplaceRegex = result.replaceRegex
      lastReplaceRegex = result.replaceTargetStr
      js = result.js
      resultElements = result.targetElements

      if (resultElements.length === 0) {
        // not found, break the loop
        break
      }
    }

    return makeResult(resultElements, lastReplaceRegex, lastReplaceTargetStr, js, jsCtx)
  })
  
  return !listRuleStep ? result.flat() : result.map(e => e instanceof Array ? e.join(',') : e)
}

function makeResult(targetElements: Array<Node>, lastReplaceRegex?: string, lastReplaceTargetStr?: string, js: string = '', ctx: JsContext = {}) {
  let result: Array<string> = []
  // all get `text`
  result = targetElements.map((e) => e.textContent || '')

  // handle content
  if (lastReplaceRegex) {
    const regex = new RegExp(lastReplaceRegex, 'g')
    result = result.map((r) => r.replace(regex, lastReplaceTargetStr || ''))
  }

  if (js) {
    if (result.length > 0) {
      ctx.result = result
    }
    result = runJs(js, ctx)
  }

  return result
}

export function extractDataByRule(text: string, rule?: string, listRule?: string, jsCtx?: JsContext): Array<string | string[]> {
  if (!rule || !text) {
    return []
  }

  function runRule(r: string) {
    if (r.startsWith('@css:')) {
      return extractDataByCSSRule(text, r)
    } else if (r.startsWith('@json:') || r.startsWith('$.')) {
      return extractDataByJSONRule(text, r)
    } else if (r.startsWith('@XPath') || r.startsWith('//')) {
      return extractDataByXPath(text, r)
    } else {
      return extractDataByDomRule(text, r, listRule, jsCtx)
    }
  }

  const splitRulesRegex = /(\|\||&&|%%)/g

  if (rule.match(splitRulesRegex)) {
    let match
    let group: any[] = []
    let lastOper = 'begin'
    let nextStartIndex = 0
    let tempResult: Array<string | string[]> = []

    function calc(rule: string, endIndex: number) {
      switch (lastOper) {
        case '||':
          if (tempResult.length === 0) {
            tempResult = runRule(rule.substring(nextStartIndex, endIndex))
          }
          break
        case '&&':
          const r = runRule(rule.substring(nextStartIndex, endIndex))
          r.forEach((e) => tempResult.push(e))
          break
        case '%%':
          // let it in group
          group.push(tempResult)
          tempResult = runRule(rule.substring(nextStartIndex, endIndex))
          break
        case 'begin':
          tempResult = runRule(rule.substring(nextStartIndex, endIndex))
          break
      }
    }
    
    while ((match = splitRulesRegex.exec(rule))) {
      calc(rule, match.index)
      lastOper = match[1]
      nextStartIndex = match.index + 2
    }
    
    // run last 
    calc(rule, rule.length)

    if (group.length > 0) {
      // need to `flat` result
      const result = []
      const groupLength = group.length
      const maxLength = Math.max(...group.map((e) => e.length))
      for (let i = 0; i < maxLength; i++) {
        for (let j = 0; j < groupLength; j++) {
          if (group[j].length > i) {
            result.push(group[j][i])
          }
        }
      }

      return result
    } else {
      return tempResult // no `%%` no gruop, return tempResult
    }
  } else {
    // no need split, use origin rule directly
    return runRule(rule)
  }
}

export function extractDataByAllInOneRule(text: string, rule: string): Record<string, Array<string>> {
  const regex = new RegExp(rule.substring(1), 'g')
  const result: Record<string, Array<string>> = {}
  let rr
  while ((rr = regex.exec(text))) {
    const indexIndex = Object.keys(rr).indexOf('index')
    for (let i = 1; i < indexIndex; i++) {
      if (!result[`$${i}`]) {
        result[`$${i}`] = []
      }
      result[`$${i}`].push(rr[i] || '')
    }
  }

  return result
}

export function extractDataByPutRule(text: string, rule: string, jsCtx?: JsContext): Record<string, Array<string | string[]>> {
  const ruleObj: any = eval(`var obj=${rule.slice(5)};obj`)
  const keys = Object.keys(ruleObj)

  return keys.reduce((result, key) => {
    const rule = ruleObj[key]
    result[key] = extractDataByRule(text, rule, '', jsCtx)
    return result
  }, {} as Record<string, Array<string | string[]>>)
}

export function extractDataByGetRule(obj: Record<string, Array<string | string[]>>, rule: string): Array<string | string[]> {
  const getRuleRegex = /^@get:\{([^\}]+)\}(##.*)?$/
  const m = rule.match(getRuleRegex)
  if (m) {
    let result = obj[m[1].trim()] || []
    if (m[2]) {
      // regex replace
      result = ruleRegexReplace(result, rule)
    }
    return result
  } else {
    return []
  }
}

export function ruleRegexReplace(data: Array<string | string[]>, rule?: string): Array<string | string[]> {
  if (!rule) {
    return data
  }
  const patten = rule.split('##')
  const rr = new RegExp(patten[1], 'g') // regex
  const tt = patten[2] || '' //  replace text
  return data.map((e) => (e instanceof Array ? e.map((ee) => ee.replace(rr, tt)) : e?.replace(rr, tt) || ''))
}
