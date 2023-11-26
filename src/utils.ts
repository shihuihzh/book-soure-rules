export function debug(log: string) {
  console.log(log)
}

export const analyzeCssStep = (step: string) => {
  let hasReplace = step.includes('##')
  let replaceRegex = ''
  let replaceTargetStr = ''
  let name = ''

  if (hasReplace) {
    const replaceInfo = step.split('##')
    replaceRegex = replaceInfo[1]
    replaceTargetStr = replaceInfo[2] || ''
    name = replaceInfo[0]
  } else {
    name = step
  }

  return {
    name,
    replaceRegex,
    replaceTargetStr,
  }
}

function makeDomStepReguarly(step: string): string {
  if (
    step.startsWith('class') ||
    step.startsWith('id') ||
    step.startsWith('tag') ||
    step.startsWith('-class') ||
    step.startsWith('-id') ||
    step.startsWith('-tag')
  ) {
    return step
  }

  const isReverse = step.startsWith('-')
  const s = step.split('.')
  const lastToken = s[s.length - 1]
  let selectorEndStep = step.length
  let hasIndex = false
  let hasRange = false
  if (!isNaN(parseInt(lastToken))) {
    // has index
    selectorEndStep = step.lastIndexOf('.')
    hasIndex = true
  }

  if (step.includes('[')) {
    // has range
    selectorEndStep = step.lastIndexOf('[')
    hasRange = true
  }

  return `${isReverse ? '-' : ''}css{${step.substring(isReverse ? 1 : 0, selectorEndStep)}}${hasIndex ? step.substring(selectorEndStep - 1) : ''}${
    hasRange ? step.substring(selectorEndStep) : ''
  }`
}

export const analyzeDomStep = (step: string, isEnd: boolean = false) => {
  let reverse = false
  let excludeIndex: number[] = []
  let includeIndex: number[] = []
  let rangeStart: number = 0
  let rangeEnd: number = 0
  let rangeStep: number = 1
  let isExclude = false
  let isRange = false
  let hasReplace = false
  let isCssRange = false
  let replaceRegex = ''
  let replaceTargetStr = ''

  const regularStep = isEnd ? step : makeDomStepReguarly(step)
  debug(`DEBUG: after regularStep: ${regularStep}`)
  let charArr = Array.from(regularStep)
  let cursor = 0
  let candiate: string = ''
  let tokens = []
  let endLoop = false
  while (!endLoop && charArr.length > 0) {
    const c = charArr.shift()
    cursor++

    switch (c) {
      case '-':
        if (cursor === 1) {
          reverse = true
        } else {
          candiate += c
        }
        break
      case '.':
      case '!':
      case '#':
      case '[':
      case ']':
      case '{':
      case '}':
        if (c === '}') {
          isCssRange = false
          break
        }

        if (isCssRange) {
          candiate += c // eating css selector, continue
          break
        }

        if (c === '{') {
          isCssRange = true
        }

        if (c === '!') {
          isExclude = true
          if (candiate.startsWith('[')) {
            candiate += c // eating indexes, continue
            break
          }
        } else if (c === '#') {
          hasReplace = true
          endLoop = true
        }

        tokens.push(candiate)
        candiate = ''

        if (c === '[') {
          candiate += c
        }
        break
      default:
        candiate += c
        break
    }
  }

  if (candiate) {
    tokens.push(candiate)
  }

  let [type, selector, posistion] = tokens
  debug(`tokens: ${tokens}`)

  if (!type && !posistion) {
    // index mode
    type = 'children'
    posistion = selector
    selector = ''
  }

  if (posistion) {
    if (posistion.startsWith('[')) {
      const posistionArray = posistion.substring(isExclude ? 2 : 1)
      if (posistionArray.includes(':')) {
        // range
        isRange = true
        const [start, end, step] = posistionArray.split(':')
        rangeStart = parseInt(start || '0')
        rangeEnd = parseInt(end || '-1')
        rangeStep = parseInt(step || '1')
      } else {
        // indexes
        const indexes = posistionArray.split(',')
        indexes.forEach((index) => {
          if (isExclude) {
            excludeIndex.push(parseInt(index))
          } else {
            includeIndex.push(parseInt(index))
          }
        })
      }
    } else {
      if (isExclude) {
        excludeIndex.push(parseInt(posistion))
      } else {
        includeIndex.push(parseInt(posistion))
      }
    }
  }
  if (hasReplace) {
    const replaceInfo = step.split('##')
    replaceRegex = replaceInfo[1]
    replaceTargetStr = replaceInfo[2] || ''
  }

  return {
    reverse,
    type,
    selector,
    isExclude,
    isRange,
    rangeStart,
    rangeEnd,
    rangeStep,
    includeIndex,
    excludeIndex,
    replaceRegex,
    replaceTargetStr,
  }
}

export function makeIndexesNonNegative(size: number, indexArray: number[]) {
  // size 10
  // -1 => 9
  // -10 => 0
  // -11 => -1 ? let it => 0
  // >= 10 let it to 9
  return indexArray.map((i) => (i < 0 ? (size + i > 0 ? size + i : 0) : i >= size ? size - 1 : i))
}

function generateFullIndexes(size: number, reverse: boolean) {
  const ans = []
  for (let i = 0; i < size; i++) {
    ans.push(i)
  }
  return reverse ? ans.reverse() : ans
}

export function makeIndexesFromRange(size: number, rangeStart: number, rangeEnd: number, rangeStep: number, isExclude: boolean) {
  let indexes: number[] = []
  let [pRangeStart, pRangeEnd] = makeIndexesNonNegative(size, [rangeStart, rangeEnd])
  const step = Math.abs(rangeStep)

  if (pRangeStart > pRangeEnd) {
    for (let i = pRangeStart; i >= pRangeEnd; i -= step) {
      indexes.push(i)
    }
  } else {
    for (let i = pRangeStart; i <= pRangeEnd; i += step) {
      indexes.push(i)
    }
  }

  if (isExclude) {
    const fullIndexes = generateFullIndexes(size, pRangeStart > pRangeEnd)
    indexes = fullIndexes.filter((i) => !indexes.includes(i))
  }

  return indexes
}
