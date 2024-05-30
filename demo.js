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
  const HighTable = require('./src/hightable.js').default
  const container = document.getElementById('app')
  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(HighTable, { data }))
}
init()

/**
 * Fake require function to load modules
 *
 * @param {string} path
 * @returns {any}
 */
function require(path) {
  if (path === 'react') return React
  if (path === 'react-dom') return ReactDOM
  if (path === './src/hightable.js') return requireUrl('hightable.tsx')
  if (path === './tableheader.js') return requireUrl('tableheader.tsx')
  throw new Error(`Cannot find module '${path}'`)
}

/**
 * Load source code from URL and compile with Babel
 *
 * @param {string} filename
 * @returns {string}
 */
function requireUrl(filename) {
  const req = new XMLHttpRequest()
  req.open('GET', `./src/${filename}`, false) // sync
  req.send()
  if (req.status !== 200) throw new Error(`Failed to load ${filename}`)
  const text = req.responseText

  // compile with babel
  const js = Babel.transform(text, { filename, presets: ['env', 'react', 'typescript'] }).code
    + `\n//# sourceURL=${filename}`
  // eval with custom require
  const run = eval('(require, exports, source) => eval(source)')
  const exports = {}
  run(require, exports, js)
  return exports
}
