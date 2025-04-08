import { createContext, useContext } from 'react'

/**
 * Config is a flat object of key-value pairs.
 *
 * Each key is generally the dromedaryCase name of a component. The namespace is global.
 *
 * It gives a way to pass additional values to the components, for example custom CSS classes.
 */
export interface Config {
  customClass?: {
    hightable?: string
    columnHeaders?: (string|undefined)[] // array of custom classes for each column header, by "df.header" 0-based index
  }
}

const ConfigContext = createContext<Config>({})

/**
 * Use the ConfigProvider to pass the Config object to the components that need it.
 *
 * Tip: memoize the Config object to avoid creating a new object on each render.
 *
 * @example
 * const config: Config = useMemo(() => ({
 *  customClass: {
 *    highTable: 'my-custom-class'
 *  }
 * }), [])
 *
 * return (
 *   <ConfigProvider value={config}>
 *     <MyComponent />
 *   </ConfigProvider>
 * )
 */
export const ConfigProvider = ConfigContext.Provider

/**
 * Use the useConfig hook to access the Config object in your components.
 *
 * @example
 * const { customClass } = useConfig()
 *
 * return (
 *   <div className={customClass?.highTable}>
 *     <MyComponent />
 *   </div>
 * )
 */
export function useConfig() {
  return useContext(ConfigContext)
}
