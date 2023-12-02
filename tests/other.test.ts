import { describe, expect, test } from '@jest/globals'
import { runJs, webview } from '../src/utils'
import encode from 'urlencode'
import puppeteer from 'puppeteer'

describe('run test', () => {
  test.skip('test eval', async () => {
    const a = runJs(`bbb`, { a: 'string', bbb: [1, 2, 3, 4] })
    console.log(a)
  }, 60_000)

  test.skip('test encode', async () => {
    const a = 'a=中国&b=中文'
    console.log(encode(a, 'gbk'))
  }, 60_000)

  test.skip('test webview', async () => {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Navigate the page to a URL
    await page.goto('https://www.baidu.com')

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 })

    // Type into search box
    await page.type('.s_ipt', '中国')

    // Wait and click on first result
    const searchResultSelector = '#su'
    await page.waitForSelector(searchResultSelector)
    await page.click(searchResultSelector)

    // Locate the full title with a unique string
    const textSelector = await page.waitForSelector('#content_left')
    // const fullTitle = await textSelector?.evaluate((el) => el.innerHTML)
    const fullTitle = await page.content()

    // Print the full title
    console.log('The title of this search is "%s".', fullTitle)

    await browser.close()
  }, 60_000)
  
  test('test util webview', async() => {
    const text = await webview('https://m.bqgbe.com/s?q=aaa')
    console.log(text);
  }, 60_000)
})
