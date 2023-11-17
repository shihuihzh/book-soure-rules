export const analyzeDomStep = (step: string) => {
  let reverse = false
  let excludeIndex: number[] = []
  let includeIndex: number[] = []
  let rangeStart: number = 0
  let rangeEnd: number = 0
  let rangeStep: number = 1
  let isExclude = false
  let isRange = false
  let hasReplace = false
  let replaceRegex = ''
  let replaceTargetStr = ''

  let charArr = Array.from(step)
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

  let [type, name, posistion] = tokens
  console.log(tokens)
  
  if (!type && !posistion) { // index mode
    type = 'children'
    posistion = name
    name = ''
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
    name,
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

export function makeIndexesFromRange(size: number, rangeStart: number, rangeEnd: number, rangeStep: number) {
  const indexes = []
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

  return indexes
}
