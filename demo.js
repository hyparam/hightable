const data = {
  header: ['ID', 'Name', 'Age', 'UUID'],
  numRows: 10000,
  async rows(start, end) {
    const arr = []
    for (let i = start; i < end; i++) {
      const uuid = Math.random().toString(16).substring(2)
      arr.push([i + 1, 'Name' + i, 20 + i, uuid])
    }
    return arr
  },
}

// Load ./src/hightable.tsx and render
function init() {
  const HighTable = require('./src/hightable.tsx').default
  const container = document.getElementById('app')
  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(HighTable, { data }))
}
init()

/**
 * Magical require function to load modules and typescript from URLs.
 * Load source code from URL and compile with babel.
 * Needs to be synchronous for require() to work.
 * Credit: https://github.com/hrgdavor/jscadui/tree/main/packages/require
 *
 * @param {string} url
 * @returns {any}
 */
function require(url) {
  if (url === 'react') return React
  if (url === 'react-dom') return ReactDOM
  if (url === './src/tableheader.js') url = './src/tableheader.tsx'

  const filename = url.replace(/^\.\//, '')
  const req = new XMLHttpRequest()
  req.open('GET', url, false) // sync
  req.send()
  if (req.status !== 200) throw new Error(`Failed to load ${filename}`)
  const text = req.responseText

  // compile with babel, sourceURL for debugging
  const js = Babel.transform(text, { filename, presets: ['env', 'react', 'typescript'] }).code
    + `\n//# sourceURL=${filename}`

  // require relative to current url
  function requireRelative(path) {
    if (path.startsWith('./')) {
      // resolve relative path
      path = url.replace(/[^/]+$/, '') + path.slice(2)
    }
    return require(path)
  }

  // eval with custom require
  const run = eval('(require, exports, source) => eval(source)')
  const exports = {}
  run(requireRelative, exports, js)
  return exports
}
