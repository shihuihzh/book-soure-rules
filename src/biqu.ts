import { BookSource } from './types'

const biquSource: BookSource = {
  bookSourceComment: '',
  bookSourceGroup: '📖 小说',
  bookSourceName: '📖 笔趣阁网',
  bookSourceType: 0,
  bookSourceUrl: 'https://www.ibiquge.net/',
  bookUrlPattern: '\\d+_\\d+/',
  customOrder: -2086021540,
  enabled: true,
  enabledCookieJar: false,
  enabledExplore: false,
  exploreUrl:
    '玄幻奇幻::xuanhuanxiaoshuo/1_{{page}}.html\n' +
    '修真仙侠::xiuzhenxiaoshuo/2_{{page}}.html\n' +
    '都市青春::dushixiaoshuo/3_{{page}}.html\n' +
    '历史军事::lishixiaoshuo/4_{{page}}.html\n' +
    '网游竞技::wangyouxiaoshuo/5_{{page}}.html\n' +
    '科幻灵异::kehuanxiaoshuo/6_{{page}}.html\n' +
    '其它小说::qitaxiaoshuo/7_{{page}}.html',
  lastUpdateTime: 1683860251838,
  loginUrl: '',
  ruleBookInfo: {
    author: 'id.info@tag.p.0@a@text',
    coverUrl: 'id.fmimg@tag.img@src',
    intro: 'id.intro@text',
    kind: 'id.info@tag.p.2@text##最后更新：',
    lastChapter: 'id.info@tag.p.3@a@text##免费章节 |正文卷 |正文 |VIP章节 ',
    name: 'id.info@h1@text',
  },
  ruleContent: { content: 'id.content@html##天才一秒记住.*无广告！|断更反馈|章节错误.*请耐心等待。' },
  ruleExplore: {
    author: 'class.s4@tag.a@text',
    bookList: 'class.l@li',
    bookUrl: 'class.s2@tag.a@href',
    coverUrl:
      'class.s2@tag.a@href<js>\n' +
      'var id = result.match(/(\\d+)\\/?$/)[1];\n' +
      'var iid = parseInt(id/1000);\n' +
      "source.bookSourceUrl + 'files/article/image/'+iid+'/'+id+'/'+id+'s.jpg';\n" +
      '</js>',
    kind: 'class.s5@text',
    lastChapter: 'class.s3@tag.a@text##免费章节 |正文卷 |正文 |VIP章节 ',
    name: 'class.s2@tag.a@text',
  },
  ruleSearch: {
    author: 'class.s4@tag.a@text',
    // bookList: 'class.novelslist2@tag.li!0',
    bookUrl: 'class.s2@tag.a@href',
    // coverUrl: 'class.s2@tag.a@href<js>\n' +
    //   'var id = result.match(/(\\d+)\\/?$/)[1];\n' +
    //   'var iid = parseInt(id/1000);\n' +
    //   "source.bookSourceUrl + 'files/article/image/'+iid+'/'+id+'/'+id+'s.jpg';\n" +
    //   '</js>',
    lastChapter: 'class.s3@tag.a@text##免费章节 |正文卷 |正文 |VIP章节 ',
    name: 'class.s2@tag.a@text',
  },
  ruleToc: {
    chapterList: 'id.list@tag.dd',
    chapterName: 'tag.a@text',
    chapterUrl: 'tag.a@href',
  },
  searchUrl: 'search.html?name={{key}}',
  weight: 0,
}

export default biquSource
