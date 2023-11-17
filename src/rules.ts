import { JSDOM } from 'jsdom'
import xpath from 'xpath'
import jp from 'jsonpath'
import { debug, analyzeDomStep, makeIndexesFromRange, makeIndexesNonNegative, analyzeCssStep } from './utils'

// dom
const queryBySelector = (targetElements: Array<Node>, selector: string, reverse: boolean) => {
  const es = targetElements.flatMap((e) => Array.from((e as Element).querySelectorAll(selector)))

  return reverse ? es.reverse() : es
}

const allChildren = (targetElements: Array<Node>, reverse: boolean) => {
  const es = targetElements.flatMap((e) => Array.from(e.childNodes)) as Element[]

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
        targetElements = (targetElements as Node[]).flatMap((e) => Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3))

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
        targetElements = queryBySelector(targetElements as Node[], name, false)
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
  debug(`all DOM rule steps: ${steps}`)
  let targetElements: Array<Node> | Array<Node[]> = [doc]

  let lastReplaceRegex,
    lastReplaceTargetStr: string = ''
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const { type, name, includeIndex, excludeIndex, reverse, replaceRegex, replaceTargetStr, isExclude, isRange, rangeStart, rangeEnd, rangeStep } =
      analyzeDomStep(step)
    lastReplaceRegex = replaceRegex
    lastReplaceTargetStr = replaceTargetStr

    debug(
      `run DOM rule step:{${step}} type:${type}, selector: ${name}, reveres: ${reverse} includeIndex: [${includeIndex}] excludeIndex: [${excludeIndex}]`
    )

    switch (type.toLowerCase()) {
      case 'class':
        targetElements = queryBySelector(targetElements as Array<Node>, `.${name}`, reverse)
        break
      case 'id':
        targetElements = queryBySelector(targetElements as Array<Node>, `#${name}`, reverse)
        break
      case 'tag':
        targetElements = queryBySelector(targetElements as Array<Node>, name, reverse)
        break
      case 'children':
        targetElements = allChildren(targetElements as Array<Node>, reverse)
        break

      // below are result case
      case 'textnodes':
        targetElements = (targetElements as Node[]).map((e) => Array.from((e as Element).childNodes).filter((c) => c.nodeType === 3))
        break

      case 'owntext':
        targetElements = (targetElements as Node[]).flatMap((e) => Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3))

      case 'href':
      case 'src':
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

    // include or exclude elements
    if (includeIndex.length > 0 || excludeIndex.length > 0 || isRange) {
      const size = targetElements.length

      if (isRange) {
        let rangeIncludeIndex = makeIndexesFromRange(size, rangeStart, rangeEnd, rangeStep, isExclude)
        targetElements = rangeIncludeIndex.map((i) => (targetElements as Node[])[i])
      } else {
        const nonNegativeIncludeIndex = makeIndexesNonNegative(size, includeIndex)
        const nonNegativeExcludeIndex = makeIndexesNonNegative(size, excludeIndex)
        targetElements = (targetElements as Node[]).filter((_, i) => {
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
