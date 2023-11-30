import { BookSource, SearchResult, UrlOption } from './types'
import { extractDataByAllInOneRule, extractDataByGetRule, extractDataByPutRule, extractDataByRule, ruleRegexReplace } from './rules'
import { analyzeUrl, arrayBufferToString, arrayUniqueByKey, debug } from './utils'
import https from 'https'

export class Source {
  constructor(public bookSource: BookSource) {}

  async test(html: string, rule: string) {
    const text = extractDataByRule(html, rule)
    console.log(text)
  }

  async search(key: string, page: number = 1): Promise<Partial<SearchResult>[]> {
    const [url, options] = analyzeUrl(this.normalizeBookUrl(this.bookSource.searchUrl), {
      key,
      page,
    })
    const result = await request(url, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
    // debug('search result test:' + result)

    const ruleOfBookList = this.bookSource.ruleSearch['bookList']?.trim() || ''
    const ignoreRules = ['checkKeyWord', 'bookList']
    return this.makeResultDynamic(this.bookSource.ruleSearch, ruleOfBookList, ignoreRules, (rule, listRule) => {
      return extractDataByRule(result, rule, listRule, { baseUrl: url, result, src: result })
    })
  }

  makeResultDynamic(rules: any, listRule: string, ignoreRules: string[], extractDataFunction: (rule: string, listRule: string) => any[]) {
    const r: any[] = []
    const rawResults: Record<string, (string | string[])[]> = {}

    Object.keys(rules)
      .filter((e) => !ignoreRules.includes(e)) // no need
      .forEach((ruleName: string) => {
        rawResults[ruleName] = extractDataFunction(rules[ruleName], listRule)
      })

    const size = Math.max(...Object.values(rawResults).map((e) => e.length))
    const keys = Object.keys(rawResults)
    for (let i = 0; i < size; i++) {
      const result: any = {}
      for (let j = 0; j < keys.length; j++) {
        const content = rawResults[keys[j]]?.[i] || ''
        result[keys[j]] = (content instanceof Array ? content.join('') : content).trim()
      }

      r.push(result)
    }

    return r
  }

  async getBookInfo(infoUrl: string) {
    let bookInfo: any[] = []

    const [url, options] = analyzeUrl(this.normalizeBookUrl(infoUrl), {})
    const result = await request(url, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
    debug('book info test:' + result)

    const initRule = this.bookSource.ruleBookInfo.init?.trim()
    if (initRule) {
      // has init
      if (initRule.startsWith(':')) {
        // allInOneRegex
        const data = extractDataByAllInOneRule(result, initRule)
        bookInfo = this.makeResultDynamic(this.bookSource.ruleBookInfo, '', ['init'], (rule: string) => data[rule])
      } else if (initRule.startsWith('@put')) {
        // put
        const data = extractDataByPutRule(result, initRule, { baseUrl: url, result, src: result })
        bookInfo = this.makeResultDynamic(this.bookSource.ruleBookInfo, '', ['init'], (rule: string) => extractDataByGetRule(data, rule))
      }
    } else {
      // no init extract one by one
    }

    return bookInfo
  }

  normalizeBookUrl(url: string) {
    return (!url.toLowerCase().startsWith('http') ? this.bookSource.bookSourceUrl : '') + url
  }

  async turnPage(u: string, pageDataFun: (url: string) => Promise<[string[], string]>) {
    const requestTasks: Record<string, Promise<[string[], string]>> = {}
    const addTasks = (url: string) => {
      if (!Object.keys(requestTasks).includes(url)) {
        requestTasks[url] = pageDataFun(url)
        return true
      } else {
        return false
      }
    }

    const run = async (urls: string[]): Promise<string[]> => {
      let hasNew = false
      for (const u of urls) {
        hasNew = addTasks(u) || hasNew
      }

      let tocPageArray: Array<[string[], string]> = await Promise.all(Object.values(requestTasks))
      if (hasNew) {
        return await run(tocPageArray.flatMap(([urls, _]) => urls))
      } else {
        return tocPageArray.map(([_, text]) => text)
      }
    }

    return await run([u])
  }

  async getBookToc(tocUrl: string) {
    const ignoreRules = ['nextTocUrl', 'chapterList']

    const tocPageData = async (url: string): Promise<[string[], string]> => {
      const [u, options] = analyzeUrl(this.normalizeBookUrl(url), {})
      debug('calling TOC page url:' + u)
      const text = await request(u, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
      const tocPageUrls = extractDataByRule(text, this.bookSource.ruleToc.nextTocUrl, '', { baseUrl: url, result: text, src: text }) as string[]
      return [tocPageUrls, text]
    }

    const results = await this.turnPage(tocUrl, tocPageData)
    const data = results.flatMap((result) =>
      this.makeResultDynamic(this.bookSource.ruleToc, this.bookSource.ruleToc.chapterList || '', ignoreRules, (r, listRule) =>
        extractDataByRule(result, r, listRule, { baseUrl: tocUrl, result: result, src: result })
      )
    )
    return arrayUniqueByKey('chapterName', data)
  }

  async getBookContent(contentUrl: string, title: string) {
    const ignoreRules = ['nextContentUrl', 'replaceRegex', 'sourceRegex', 'webJs', 'imageStyle', 'payAction', 'imageDecode']

    const pageDate = async (url: string): Promise<[string[], string]> => {
      const [u, options] = analyzeUrl(this.normalizeBookUrl(url), {})
      debug('calling content page url:' + u)
      const text = await request(u, this.bookSource.header ? JSON.parse(this.bookSource.header) : {}, options)
      const tocPageUrls = extractDataByRule(text, this.bookSource.ruleContent.nextContentUrl, '', {
        baseUrl: url,
        result: text,
        src: text,
      }) as string[]
      return [tocPageUrls, text]
    }

    const results = await this.turnPage(contentUrl, pageDate)
    const data = results
      .flatMap((result) =>
        this.makeResultDynamic(this.bookSource.ruleContent, '', ignoreRules, (r, listRule) =>
          extractDataByRule(result, r, listRule, { baseUrl: contentUrl, result, src: result })
        )
      )
      .map((e) => e.content)

    return {
      title: data[0]?.title || title,
      content: ruleRegexReplace(data, this.bookSource.ruleContent.replaceRegex),
    }
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
    agent: new https.Agent({
      rejectUnauthorized: false,
    }),
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

  // console.log(`requesting: ${url}\n opts: ${JSON.stringify(reqOps, null, 2)}`)

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
