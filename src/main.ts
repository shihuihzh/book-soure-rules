import fs from 'fs/promises'
import biquSource from './biqu'
import { BookSource, SearchResult } from './types'
import { JSDOM } from 'jsdom'
import { analyzeDomStep, makeIndexesFromRange, makeIndexesNonNegative } from './utils'

function debug(log: string) {
  console.log(log)
}

class Source {
  constructor(public bookSource: BookSource) {}

  extractDataByDomRule(html: string, rule?: string): Array<string | string[]> {
    if (!rule || !html) {
      return []
    }

    const dom = new JSDOM(html)
    const doc = dom.window.document
    const queryBySelector = (targetElements: Array<Node>, selector: string, reverse: boolean) => {
      const es = targetElements.flatMap((e) => Array.from((e as Element).querySelectorAll(selector)))

      return reverse ? es.reverse() : es
    }

    const allChildren = (targetElements: Array<Node>, reverse: boolean) => {
      const es = targetElements.flatMap((e) => Array.from(e.childNodes)) as Element[]

      return reverse ? es.reverse() : es
    }

    let result: Array<string | string[]> = []

    const steps = rule.split('@')
    const emptyTextNode = doc.createTextNode('')
    debug(`all rule steps: ${steps}`)
    let targetElements: Array<Node> | Array<Node[]> = [doc]

    let lastReplaceRegex, lastReplaceTargetStr: string
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const { type, name, includeIndex, excludeIndex, reverse, replaceRegex, replaceTargetStr, isRange, rangeStart, rangeEnd, rangeStep } =
        analyzeDomStep(step)
      lastReplaceRegex = replaceRegex
      lastReplaceTargetStr = replaceTargetStr

      debug(
        `run rule step:{${step}} type:${type}, selector: ${name}, reveres: ${reverse} includeIndex: [${includeIndex}] excludeIndex: [${excludeIndex}]`
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
          let rangeIncludeIndex = makeIndexesFromRange(size, rangeStart, rangeEnd, rangeStep)
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

    // all get `text`
    result = targetElements.map((e) => (e instanceof Array ? e.map((ee) => ee.textContent || '') : e.textContent || ''))

    // handle content
    if (lastReplaceRegex) {
      const regex = new RegExp(lastReplaceRegex, 'g')
      result = result.map((r) => {
        if (r instanceof Array) {
          return r.map((rr) => rr.replace(regex, lastReplaceTargetStr))
        } else {
          return r.replace(regex, lastReplaceTargetStr)
        }
      })
    }
    return result
  }

  async test(html: string, rule: string) {
    const text = this.extractDataByDomRule(html, rule)
    console.log(text)
  }

  async search(key: string): Promise<Partial<SearchResult>[]> {
    const url = this.bookSource.bookSourceUrl + this.bookSource.searchUrl.replace('{{key}}', key)
    const result = await request(url)
    const searchResults: Partial<SearchResult>[] = []
    const rawResults: Record<string, (string | string[])[]> = {}

    Object.keys(this.bookSource.ruleSearch).forEach((ruleName: string) => {
      rawResults[ruleName] = this.extractDataByDomRule(result, this.bookSource.ruleSearch[ruleName])
    })

    const size = rawResults['name'].length
    const keys = Object.keys(rawResults)
    for (let i = 0; i < size; i++) {
      const result: Partial<SearchResult> = {}
      for (let j = 0; j < keys.length; j++) {
        result[keys[j]] = (rawResults[keys[j]]?.[i] as string) || ''
      }

      searchResults.push(result)
    }

    return searchResults
  }
}

async function request(url: string, options?: { method?: 'string'; headers?: Record<string, string> }) {
  const defaultHeader = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  }

  const reqOps = {
    method: options?.method || 'GET',
    headers: { ...defaultHeader, ...(options?.headers || {}) },
  }

  const resp = await fetch(url, reqOps)
  return resp.text()
}

async function main() {
  const source = new Source(biquSource)
  // source.search('凡人修仙传').then(e => console.log(JSON.stringify(e)))
  //
  // 'class.novelslist2@tag.li!0'.split('@').forEach((e) => {
  //   console.log(analyzeDomStep(e))
  // })
  //
  // source.test(await fs.readFile('./test/search.html', 'utf-8'), 'class.s2@tag.a[10:0:-2]@text')
  //
  // console.log(analyzeDomStep('[1:100]'))
}

main()
