import fs from 'fs/promises'
import biquSource from './biqu'
import { BookSource, SearchResult } from './types'
import { extractDataByCSSRule, extractDataByDomRule, extractDataByJSONRule, extractDataByXPath } from './rules'
import { analyzeCssStep } from './utils'

class Source {
  constructor(public bookSource: BookSource) {}
  
  extractDataByRule(text: string, rule?: string): Array<string | string[]> {
    if (!rule || !text) {
      return []
    }

    if(rule.startsWith('@css:')) {
      return extractDataByCSSRule(text, rule)

    } else if(rule.startsWith('@json:') || rule.startsWith('$.')) {
      return extractDataByJSONRule(text, rule)
    } else if(rule.startsWith('@XPath') || rule.startsWith('//')) {
      return extractDataByXPath(text, rule)
    } else {
      return extractDataByDomRule(text, rule)
    }
    
  }

   async test(html: string, rule: string) {
    const text = this.extractDataByRule(html, rule)
    console.log(text)
  }

  async search(key: string): Promise<Partial<SearchResult>[]> {
    const url = this.bookSource.bookSourceUrl + this.bookSource.searchUrl.replace('{{key}}', key)
    const result = await request(url)
    const searchResults: Partial<SearchResult>[] = []
    const rawResults: Record<string, (string | string[])[]> = {}

    Object.keys(this.bookSource.ruleSearch).forEach((ruleName: string) => {
      rawResults[ruleName] = this.extractDataByRule(result, this.bookSource.ruleSearch[ruleName])
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
  //
  // '[property=og:novel:author]@content'.split('@').forEach((e) => {
  //   console.log(analyzeCssStep(e))
  // })

  // source.test(await fs.readFile('./test/search.html', 'utf-8'), '@css:#main > div.novelslist2 > ul > li > span.s2.wid@text##凡人##howe')
  // var cities = [
  //   { name: "London", "population": 8615246 },
  //   { name: "Berlin", "population": 3517424 },
  //   { name: "Madrid", "population": 3165235 },
  //   { name: "Rome",   "population": 2870528 }
  // ];
  // source.test(JSON.stringify(cities), '$..population')
  source.test(await fs.readFile('./test/search.html', 'utf-8'), '//*[@id="main"]/div[1]/ul/li[3]/span')
}

main()
