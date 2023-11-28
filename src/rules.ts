import { JSDOM } from 'jsdom'
import xpath from 'xpath'
import jp from 'jsonpath'
import simpleEval from 'simple-eval'
import { debug, analyzeDomStep, makeIndexesFromRange, makeIndexesNonNegative, analyzeCssStep, analyzeDomStepV2 } from './utils'

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

export function extractDataByXPath(html: string, rule: string): Array<string | string[]> {
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

  return makeResult(targetElements, lastReplaceRegex, lastReplaceTargetStr)
}

export function extractDataByDomRule(html: string, rule: string): Array<string | string[]> {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const steps = rule.split('@')
  const emptyTextNode = doc.createTextNode('')
  debug(`all DOM rule steps: ${steps.join(', ')}`)
  let targetElements: Array<Node> | Array<Node[]> = [doc]

  let lastReplaceRegex,
    lastReplaceTargetStr: string = ''
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
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

    lastReplaceRegex = replaceRegex
    lastReplaceTargetStr = replaceTargetStr

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

    debug(`run DOM rule step: ${JSON.stringify(stepAfterAnalyze, null, 2)}`)

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

      // below are result case
      case 'textnodes':
        targetElements = (targetElements as Node[]).map((e) => Array.from((e as Element).childNodes).filter((c) => c.nodeType === 3))
        break

      case 'owntext':
        targetElements = (targetElements as Node[]).map((e) => doc.createTextNode(Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3).map(c => c.textContent).join('')))
        break

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
    }

    if (targetElements.length === 0) {
      // not found, break the loop
      break
    }
  }

  return makeResult(targetElements, lastReplaceRegex, lastReplaceTargetStr)
}

function makeResult(targetElements: Array<Node> | Array<Node[]>, lastReplaceRegex?: string, lastReplaceTargetStr?: string) {
  let result: Array<string | string[]> = []
  // all get `text`
  result = targetElements.map((e) => (e instanceof Array ? e.map((ee) => ee.textContent || '') : e.textContent || ''))

  // handle content
  if (lastReplaceRegex) {
    const regex = new RegExp(lastReplaceRegex, 'g')
    result = result.map((r) => {
      if (r instanceof Array) {
        return r.map((rr) => rr.replace(regex, lastReplaceTargetStr || ''))
      } else {
        return r.replace(regex, lastReplaceTargetStr || '')
      }
    })
  }

  return result
}

export function extractDataByRule(text: string, rule?: string): Array<string | string[]> {
  if (!rule || !text) {
    return []
  }

  // replace all /n or /r to empty string
  rule = rule.replace(/(\r\n|\n|\r)/gm, '')

  if (rule.startsWith('@css:')) {
    return extractDataByCSSRule(text, rule)
  } else if (rule.startsWith('@json:') || rule.startsWith('$.')) {
    return extractDataByJSONRule(text, rule)
  } else if (rule.startsWith('@XPath') || rule.startsWith('//')) {
    return extractDataByXPath(text, rule)
  } else {
    return extractDataByDomRule(text, rule)
  }
}

export function extractDataByAllInOneRule(text: string, rule: string): Record<string, string> {
  return {}
}

export function extractDataByPutRule(text: string, rule: string): Record<string, Array<string | string[]>> {
  const ruleObj: any = eval(`var obj=${rule.slice(5)};obj`)
  const keys = Object.keys(ruleObj)

  return keys.reduce((result, key) => {
    const rule = ruleObj[key]
    result[key] = extractDataByRule(text, rule)
    return result
  }, {} as Record<string, Array<string | string[]>>)
}

export function extractDataByGetRule(obj: Record<string, Array<string | string[]>>, rule: string): Array<string | string[]> {
  const getRuleRegex = /^@get:\{([^\}]+)\}(##.*)?$/
  const m = rule.match(getRuleRegex)
  if (m) {
    let result = obj[m[1].trim()] || []
    if (m[2]) { // regex replace
      const patten = rule.split('##')
      const rr = new RegExp(patten[1], 'g') // regex
      const tt = patten[2] || '' //  replace text
      result = result.map(e => e instanceof Array ? e.map(ee => ee.replace(rr, tt) )  : e.replace(rr, tt) )
    }
    return  result
  } else {
    return []
  }
}
