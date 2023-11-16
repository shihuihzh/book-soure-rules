export const analyzeDomStep = (step: string) => {
  let reverse = false
  let excludeIndex: number[] = []
  let includeIndex: number[] = []
  let rangeStart: number = 0
  let rangeEnd: number = 0
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
        if (c === '!') {
          isExclude = true
        }

        if (c === '#') {
          hasReplace = true
          endLoop = true
        }

        tokens.push(candiate)
        candiate = ''
        break
      default:
        candiate += c
        break
    }
  }

  if (candiate) {
    tokens.push(candiate)
  }

  const [type, name, posistion] = tokens
  if (posistion) {
    if (isExclude) {
      excludeIndex.push(parseInt(posistion))
    } else {
      includeIndex.push(parseInt(posistion))
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
    includeIndex,
    excludeIndex,
    replaceRegex,
    replaceTargetStr,
  }
}
