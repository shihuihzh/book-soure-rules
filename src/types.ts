// rules
type RuleBookBase = Record<string, string> & {
  author: string
  coverUrl: string
  intro: string
  kind: string
  lastChapter: string
  name: string
  wordCount: string
}

export type RuleBookInfo = RuleBookBase & {
  init: string
  tocUrl: string
  canReName: string
  downloadUrls: string
}

export type RuleExplore = RuleBookBase & {
  bookList: string
  bookUrl: string
}

export type RuleSearch = RuleExplore & {
  checkKeyWord: string
}

export type RuleContent = {
  content: string
  nextContentUrl: string
  webJs: string
  sourceRegex: string
  replaceRegex: string
  title: string
  imageStyle: string
  payAction: string
  imageDecode: string
}

export type RuleToc = {
  chapterList: string
  chapterName: string
  chapterUrl: string
  nextTocUrl: string
}

export type BookSource = {
  bookSourceComment: string
  bookSourceGroup: string
  bookSourceName: string
  bookSourceType: number
  bookSourceUrl: string
  bookUrlPattern: string
  customOrder: number
  enabled: boolean
  enabledExplore: boolean
  enabledCookieJar: boolean
  exploreUrl: string
  lastUpdateTime: number
  loginUrl: string
  ruleBookInfo: Partial<RuleBookInfo>
  ruleContent: Partial<RuleContent>
  ruleExplore: Partial<RuleExplore>
  ruleSearch: Partial<RuleSearch>
  ruleToc: Partial<RuleToc>
  searchUrl: string
  weight: number
  header?: string
}

// #####
export type SearchResult = RuleSearch & {}

export type UrlOption = {
  method: string
  headers: Record<string, string>
  body: string
  charset: string
  webView: boolean
  type: string
  js: string
  retry: number
}

export type JsContext = {
  baseUrl?: string // 变量-当前url,String
  result?: string | Array<string | string[]> // 变量-上一步的结果
  book?: string // 变量-书籍类,方法见 io.legado.app.data.entities.Book
  cookie?: string // 变量-cookie操作类,方法见 io.legado.app.help.http.CookieStore
  cache?: string // 变量-缓存操作类,方法见 io.legado.app.help.CacheManager
  chapter?: string // 变量-当前目录类,方法见 io.legado.app.data.entities.BookChapter
  title?: string // 变量-当前标题,String
  src?: string // 内容,源码
}
