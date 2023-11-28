import { BookSource, SearchResult, UrlOption } from './types'
import { extractDataByAllInOneRule, extractDataByCSSRule, extractDataByDomRule, extractDataByGetRule, extractDataByJSONRule, extractDataByPutRule, extractDataByRule, extractDataByXPath } from './rules'
import { analyzeUrl, arrayBufferToString, debug } from './utils'

export class Source {
  constructor(public bookSource: BookSource) {}


  async test(html: string, rule: string) {
    const text = extractDataByRule(html, rule)
    console.log(text)
  }

  async search(key: string, page: number = 1): Promise<Partial<SearchResult>[]> {
    const [url, options] = analyzeUrl(
      (!this.bookSource.searchUrl?.toLowerCase().startsWith('http') ? this.bookSource.bookSourceUrl : '') + this.bookSource.searchUrl,
      {
        key,
        page,
      }
    )
    const result = await request(url, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
    // debug('search result test:' + result)

    const searchResults: Partial<SearchResult>[] = []
    const rawResults: Record<string, (string | string[])[]> = {}
    const ruleOfBookList = this.bookSource.ruleSearch['bookList']?.trim()
    const ignoreRules = ['checkKeyWord', 'bookList']

    Object.keys(this.bookSource.ruleSearch)
      .filter((e) => !ignoreRules.includes(e)) // no need
      .forEach((ruleName: string) => {
        rawResults[ruleName] = extractDataByRule(result, `${ruleOfBookList ? ruleOfBookList + '@' : ''}${this.bookSource.ruleSearch[ruleName]}`)
      })

    const size = rawResults['name'].length
    const keys = Object.keys(rawResults)
    for (let i = 0; i < size; i++) {
      const result: Partial<SearchResult> = {}
      for (let j = 0; j < keys.length; j++) {
        result[keys[j]] = ((rawResults[keys[j]]?.[i] as string) || '').trim()
      }

      searchResults.push(result)
    }

    return searchResults
  }
  
  makeResultDynamic(rules: any, prefixRule: string, ignoreRules: string[], extractDataFunction: (rule: string) => any[]){
    const r: any[] = []
    const rawResults: Record<string, (string | string[])[]> = {}

    Object.keys(rules)
      .filter((e) => !ignoreRules.includes(e)) // no need
      .forEach((ruleName: string) => {
        rawResults[ruleName] = extractDataFunction(`${prefixRule ? prefixRule + '@' : ''}${rules[ruleName]}`)
      })

    const size = rawResults['name'].length
    const keys = Object.keys(rawResults)
    for (let i = 0; i < size; i++) {
      const result: any = {}
      for (let j = 0; j < keys.length; j++) {
        result[keys[j]] = ((rawResults[keys[j]]?.[i] as string) || '').trim()
      }

      r.push(result)
    }

    return r
    
  }
  
  async bookInfo(infoUrl: string) {
    let bookInfo: any[] = []

    const [url, options] = analyzeUrl(
      (!infoUrl.toLowerCase().startsWith('http') ? this.bookSource.bookSourceUrl : '') + infoUrl, {}
    )
    const result = await request(url, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
    debug('book info test:' + result)
    
    const initRule = this.bookSource.ruleBookInfo.init?.trim()
    if(initRule) { // has init
      let data: unknown = {}
      if (initRule.startsWith(':')) { // allInOneRegex
        data = extractDataByAllInOneRule(result, initRule)
      } else  if (initRule.startsWith('@put')) { // put
        const data = extractDataByPutRule(result, initRule)
        bookInfo = this.makeResultDynamic(this.bookSource.ruleBookInfo, '', ['init'], (rule: string) => extractDataByGetRule(data, rule))
      }

    } else { // no init extract one by one
      
    }
    
    return bookInfo
    
  }
}

async function request(url: string, headers?: Record<string, string>, options?: UrlOption) {
  const defaultHeader = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  }

  const reqOps: any = {
    method: options?.method || 'GET',
    headers: { ...defaultHeader, ...headers, ...(options?.headers || {}) },
    redirect: 'follow',
  }
  
  if (options?.body) {
    if (options.type?.toLowerCase().includes('json')) {
      reqOps.body = JSON.stringify(options.body)
      reqOps.headers['Content-Type'] = 'application/json'
    } else {
      reqOps.body = encodeURI(options.body)
      reqOps.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
  }

  console.log(`requesting: ${url}\n opts: ${JSON.stringify(reqOps, null, 2)}`);
  
  const resp = await fetch(url, reqOps)
  return arrayBufferToString(await resp.arrayBuffer(), options?.charset || 'utf-8')
}

// async function main() {
//   const source = new Source(biquSource)
//   // source.search('凡人修仙传').then(e => console.log(JSON.stringify(e)))
//   //
//   // 'class.novelslist2@tag.li!0'.split('@').forEach((e) => {
//   //   console.log(analyzeDomStep(e))
//   // })
//   //
//   source.test(await fs.readFile('./test/search.html', 'utf-8'), '.s2 a[10:0:-2]@text')
//   //
//   //
//   // '[property=og:novel:author]@content'.split('@').forEach((e) => {
//   //   console.log(analyzeCssStep(e))
//   // })

//   // source.test(await fs.readFile('./test/search.html', 'utf-8'), '@css:#main > div.novelslist2 > ul > li > span.s2.wid@text##凡人##howe')
//   // var cities = [
//   //   { name: "London", "population": 8615246 },
//   //   { name: "Berlin", "population": 3517424 },
//   //   { name: "Madrid", "population": 3165235 },
//   //   { name: "Rome",   "population": 2870528 }
//   // ];
//   // source.test(JSON.stringify(cities), '$..population')
//   // source.test(await fs.readFile('./test/search.html', 'utf-8'), '//*[@id="main"]/div[1]/ul/li[2]/span[2]/a/@href')
// }

// main()
