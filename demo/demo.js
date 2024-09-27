const header = ['ID', 'Name', 'Age', 'UUID', 'Text', 'JSON']
const dataframe = {
  header,
  numRows: 10000,
  async rows(start, end) {
    const arr = []
    for (let i = start; i < end; i++) {
      const rand = Math.abs(Math.sin(i + 1))
      const uuid = rand.toString(16).substring(2)
      const row = {
        ID: i + 1,
        Name: 'Name' + i,
        Age: 20 + i % 80,
        UUID: uuid,
        Text: lorem(rand, 100),
      }
      const object = Object.fromEntries(header.slice(0, -1).map((key, index) => [key, row[index]]))
      arr.push({ ...row, object })
    }
    await delay(20)
    return arr
  },
}

// Load HighTable.tsx and render
function init() {
  const { HighTable, sortableDataFrame } = require('./src/HighTable.tsx')
  const sortable = sortableDataFrame(dataframe)
  const container = document.getElementById('app')
  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(HighTable, { data: sortable }))
}
init()

function lorem(rand, length) {
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit'.split(' ')
  const str = Array.from({ length }, (_, i) => words[Math.floor(i + rand * 8) % 8]).join(' ')
  return str[0].toUpperCase() + str.slice(1)
}

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
  if (url === './src/TableHeader.js') url = './src/TableHeader.tsx'
  if (url === './src/dataframe.js') url = './src/dataframe.ts'

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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
