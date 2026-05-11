

const DARK_TOKEN = /\.dark(?=[\s,\.\#:\[\\]|$)/

function selectorIsDark(sel) {
  return DARK_TOKEN.test(sel)
}

module.exports = () => ({
  postcssPlugin: 'postcss-strip-dark',
  Once(root) {
    let droppedRules = 0
    let droppedBytes = 0

    root.walkRules((rule) => {
      const before = rule.toString().length
      const sels = rule.selectors
      const kept = sels.filter((s) => !selectorIsDark(s))

      if (kept.length === 0) {
        droppedRules++
        droppedBytes += before
        rule.remove()
      } else if (kept.length !== sels.length) {
        rule.selectors = kept
      }
    })

    if (process.env.STRIP_DARK_VERBOSE === 'true') {
      
      console.log(`[postcss-strip-dark] dropped ${droppedRules} rules (~${(droppedBytes/1024).toFixed(1)} KB)`)
    }
  },
})

module.exports.postcss = true
