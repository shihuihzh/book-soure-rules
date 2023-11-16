import biquSource from './biqu'
import { BookSource, SearchResult } from './types'
import { JSDOM } from 'jsdom'
import { analyzeDomStep } from './utils'

function debug(log: string) {
  console.log(log)
}

class Source {
  constructor(public bookSource: BookSource) {}

  extractDataByDomRule(html: string, rule?: string): Array<string | string[]> {
    debug(`rule: ${rule}`)
    if (!rule || !html) {
      return []
    }

    const dom = new JSDOM(html)
    const doc = dom.window.document
    const queryBySelector = (targetElements: Node | Array<Node>, selector: string, reverse: boolean) => {
      const es =
        targetElements instanceof Array
          ? targetElements.flatMap((e) => Array.from((e as Element).querySelectorAll(selector)))
          : Array.from((targetElements as Element).querySelectorAll(selector))

      return reverse ? es.reverse() : es
    }

    const allChildren = (targetElements: Node | Array<Node>, reverse: boolean) => {
      const es =
        targetElements instanceof Array
          ? (targetElements.flatMap((e) => Array.from(e.childNodes)) as Element[])
          : (Array.from(targetElements.childNodes) as Element[])

      return reverse ? es.reverse() : es
    }

    let result: Array<string | string[]> = []

    const steps = rule.split('@')
    debug(`rule steps: ${steps}`)
    let targetElements: Node | Array<Node> | Array<Node[]> = doc
    let emptyTextNode = doc.createTextNode('')

    let lastReplaceRegex, lastReplaceTargetStr: string
    for (let i = 0; i < steps.length; i++) {
      const { type, name, includeIndex, excludeIndex, reverse, replaceRegex, replaceTargetStr } = analyzeDomStep(steps[i])
      lastReplaceRegex = replaceRegex
      lastReplaceTargetStr = replaceTargetStr

      debug(`run rule: type:${type}, selector: ${name}, reveres: ${reverse} includeIndex: [${includeIndex}] excludeIndex: [${excludeIndex}]`)

      switch (type.toLowerCase()) {
        case 'class':
          targetElements = queryBySelector(targetElements as Node | Array<Node>, `.${name}`, reverse)
          break
        case 'id':
          targetElements = queryBySelector(targetElements as Node | Array<Node>, `#${name}`, reverse)
          break
        case 'tag':
          targetElements = queryBySelector(targetElements as Node | Array<Node>, name, reverse)
          break
        case 'children':
          targetElements = allChildren(targetElements as Node | Array<Node>, reverse)
          break

        // below are result case
        case 'text':
          // result =
          //   targetElements instanceof Array
          //     ? targetElements.map((e) => e.textContent || '')
          //     : [(targetElements as unknown as HTMLElement).textContent || '']
          break

        case 'textnodes':
          targetElements =
            targetElements instanceof Array
              ? targetElements.map((e) => Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3))
              : [Array.from((targetElements as unknown as HTMLElement).childNodes).filter((c) => c.nodeType === 3)]
          break

        case 'owntext':
          targetElements =
            targetElements instanceof Array
              ? targetElements.flatMap((e) => Array.from((e as HTMLElement).childNodes).filter((c) => c.nodeType === 3))
              : Array.from((targetElements as unknown as HTMLElement).childNodes).filter((c) => c.nodeType === 3)

        case 'href':
          targetElements =
            targetElements instanceof Array
              ? (targetElements as Node[]).map((e) => (e as Element).attributes.getNamedItem('href') || emptyTextNode)
              : [(targetElements as unknown as Element).attributes.getNamedItem('href') || emptyTextNode]
          break

        case 'src':
          targetElements =
            targetElements instanceof Array
              ? (targetElements as Node[]).map((e) => (e as Element).attributes.getNamedItem('src') || emptyTextNode)
              : [(targetElements as unknown as Element).attributes.getNamedItem('src') || emptyTextNode]
          break
        case 'html':
          targetElements =
            targetElements instanceof Array
              ? (targetElements as Node[]).map((e) => doc.createTextNode((e as Element).innerHTML || ''))
              : [doc.createTextNode((targetElements as Element).innerHTML || '')]
          break
        case 'all':
          // what's all means.
          break
      }

      // if (targetElements.length === 0) {
      //   // not found, break the loop
      //   break
      // }

      // include or exclude elements
      if (includeIndex.length > 0 || excludeIndex.length > 0) {
        if (targetElements instanceof Array) {
          targetElements = (targetElements as Node[]).filter((_, i) => {
            if (excludeIndex.includes(i)) {
              return false
            }

            if (includeIndex.includes(i)) {
              return true
            }

            return true
          })
        }
      }
    }

    result =
      targetElements instanceof Array
        ? targetElements.map((e) => (e instanceof Array ? e.map((ee) => ee.textContent || '') : e.textContent || ''))
        : [(targetElements as Element).textContent || '']

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
        result[keys[j]] = rawResults[keys[j]][i] as string
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

function main() {
  const source = new Source(biquSource)
  source.search('凡人修仙传').then(e => console.log(JSON.stringify(e)))
  //
  // 'class.novelslist2@tag.li!0'.split('@').forEach((e) => {
  //   console.log(analyzeDomStep(e))
  // })
}

main()
