import { describe, expect, test } from '@jest/globals'
import simpleEval from 'simple-eval'

describe('run test', () => {
  test('test eval', async () => {
    const a = eval('{a:1}')
    console.log(a);
  }, 60_000)



})
