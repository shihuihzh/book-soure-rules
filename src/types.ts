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
