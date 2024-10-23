const { HighTable, rowCache, sortableDataFrame, wrapPromise } = require('./src/HighTable.tsx')

const header = ['ID', 'Name', 'Age', 'UUID', 'Text', 'JSON']
const mockData = {
  header,
  numRows: 10000,
  rows(start, end) {
    const arr = []
    for (let i = start; i < end; i++) {
      const rand = Math.abs(Math.sin(i + 1))
      const uuid = rand.toString(16).substring(2)
      const partial = {
        ID: i + 1,
        Name: 'Name' + i,
        Age: 20 + i % 80,
        UUID: uuid,
        Text: lorem(rand, 100),
      }
      const object = Object.fromEntries(header.slice(0, -1).map(key => [key, partial[key]]))
      const row = { ...partial, JSON: JSON.stringify(object) }
      // Map to randomly delayed promises
      const promised = Object.fromEntries(header.map(key =>
        // discrete time delay for each cell to simulate async data loading
        [key, wrapPromise(delay(row[key], 100 * Math.floor(10 * Math.random())))]
      ))
      arr.push(promised)
    }
    return arr
  },
}

// Load HighTable.tsx and render
function init() {
  let data = sortableDataFrame(mockData)
  data = rowCache(data)
  const cacheKey = 'demo'
  const container = document.getElementById('app')
  const root = ReactDOM.createRoot(container)
  root.render(React.createElement(HighTable, { data, cacheKey }))
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
  if (url === './src/rowCache.js') url = './src/rowCache.ts'

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

function delay(value, ms) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}
