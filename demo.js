const header = ['ID', 'Name', 'Age']
const data = [
  [1, 'Alice', 25],
  [2, 'Bob', 28],
  [3, 'Carol', 32],
]

// Load ./src/hightable.tsx and render
function init() {
  const HighTable = require('./src/hightable.tsx').default
  const container = document.getElementById('app')
  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(HighTable, { header, data }))
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
  if (path.startsWith('./src/')) return loadFromUrl(path.slice(6))
  if (path.startsWith('./')) return loadFromUrl(path.slice(2))
  throw new Error(`Cannot find module '${path}'`)
}

/**
 * Load source code from URL and compile with Babel
 *
 * @param {string} filename
 * @returns {string}
 */
function loadFromUrl(filename) {
  const req = new XMLHttpRequest()
  req.open('GET', `./src/${filename}`, false) // sync
  req.send()
  if (req.status !== 200) throw new Error(`Failed to load ${filename}`)
  const text = req.responseText

  // compile with babel
  const js = Babel.transform(text, { filename, presets: ['env', 'react', 'typescript'] }).code
  // eval with custom require
  const run = eval('(require, exports, source) => eval(source)')
  const exports = {}
  run(require, exports, js)
  return exports
}
