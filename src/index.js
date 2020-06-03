const GLUED_NAMESPACE_OPTION = '__GLUED_NAMESPACE__'

/**
 * Reduce the code which written in Vue.js for getting the state.
 * @param {Object|Array} states # Object's item can be a function which accept state and getters for param, you can do something for state and getters in it.
 * @param {Object}
 */
export const mapState = (states) => {
  const res = {}
  if (__DEV__ && !isValidMap(states)) {
    console.error(
      '[vuex-glue] mapState: mapper parameter must be either an Array or an Object'
    )
  }
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState() {
      const { state, getters } = getStoreInfo(this, 'mapState')
      if (!state && !getters) {
        return
      }

      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
}

/**
 * Reduce the code which written in Vue.js for committing the mutation
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} mutations # Object's item can be a function which accept `commit` function as the first param, it can accept anthor params. You can commit mutation and do any other things in this function. specially, You need to pass anthor params from the mapped function.
 * @return {Object}
 */
export const mapMutations = (mutations) => {
  const res = {}
  if (__DEV__ && !isValidMap(mutations)) {
    console.error(
      '[vuex-glue] mapMutations: mapper parameter must be either an Array or an Object'
    )
  }
  normalizeMap(mutations).forEach(({ key, val }) => {
    res[key] = function mappedMutation(...args) {
      // Get the commit method from store
      const { commit } = getStoreInfo(this, 'mapMutations')
      if (!commit) {
        return
      }
      return typeof val === 'function'
        ? val.apply(this, [commit].concat(args))
        : commit.apply(this.$store, [val].concat(args))
    }
  })
  return res
}

/**
 * Reduce the code which written in Vue.js for getting the getters
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} getters
 * @return {Object}
 */
export const mapGetters = (getters) => {
  const res = {}
  if (__DEV__ && !isValidMap(getters)) {
    console.error(
      '[vuex-glue] mapGetters: mapper parameter must be either an Array or an Object'
    )
  }
  normalizeMap(getters).forEach(({ key, val }) => {
    // The namespace has been mutated by normalizeNamespace
    res[key] = function mappedGetter() {
      const { namespace } = getStoreInfo(this, 'mapGetters')
      const getterName = namespace ? namespace + val : val
      if (__DEV__ && !(getterName in this.$store.getters)) {
        console.error(`[vuex-glue] unknown getter: ${val}`)
        return
      }
      return this.$store.getters[getterName]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
}

/**
 * Reduce the code which written in Vue.js for dispatch the action
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} actions # Object's item can be a function which accept `dispatch` function as the first param, it can accept anthor params. You can dispatch action and do any other things in this function. specially, You need to pass anthor params from the mapped function.
 * @return {Object}
 */
export const mapActions = (actions) => {
  const res = {}
  if (__DEV__ && !isValidMap(actions)) {
    console.error(
      '[vuex-glue] mapActions: mapper parameter must be either an Array or an Object'
    )
  }
  normalizeMap(actions).forEach(({ key, val }) => {
    res[key] = function mappedAction(...args) {
      const { dispatch } = getStoreInfo(this, 'mapActions')
      if (!dispatch) {
        return
      }
      return typeof val === 'function'
        ? val.apply(this, [dispatch].concat(args))
        : dispatch.apply(this.$store, [val].concat(args))
    }
  })
  return res
}

export const glueComponent = (component, namespace) => {
  const clone = Object.assign(
    {
      [GLUED_NAMESPACE_OPTION]: namespace
    },
    component
  )
  return clone
}

export const glueStore = (store, additional = {}) => {
  return {
    state: () => {
      return {
        ...store.state ? store.state() : {},
        ...additional.state ? additional.state() : {}
      }
    },
    getters: {
      ...store.getters || {},
      ...additional.getters || {}
    },
    mutations: {
      ...store.mutations || {},
      ...additional.mutations || {}
    },
    actions: {
      ...store.actions || {},
      ...additional.actions || {}
    }
  }
}

/**
 * Normalize the map
 * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
 * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
 * @param {Array|Object} map
 * @return {Object}
 */
function normalizeMap(map) {
  if (!isValidMap(map)) {
    return []
  }
  return Array.isArray(map)
    ? map.map((key) => ({ key, val: key }))
    : Object.keys(map).map((key) => ({ key, val: map[key] }))
}

/**
 * Validate whether given map is valid or not
 * @param {*} map
 * @return {Boolean}
 */
function isValidMap(map) {
  return Array.isArray(map) || isObject(map)
}

function normalizeNamespace(namespace) {
  if (!namespace) return null
  return namespace.charAt(namespace.length - 1) !== '/'
    ? namespace + '/'
    : namespace
}

/**
 * Search a special store info from component's option. If option not found, use root store.
 * @param {Object} store
 * @param {String} helper
 * @return {Object}
 */
function getStoreInfo(component, helperName) {
  const namespace = normalizeNamespace(findInstalledNamespace(component))

  if (!namespace) {
    return ['state', 'getters', 'commit', 'dispatch'].reduce(
      (module, property) => {
        module[property] = component.$store[property]
        return module
      },
      {}
    )
  }

  const module = component.$store._modulesNamespaceMap[namespace]
  if (__DEV__ && !module) {
    console.error(
      `[vuex-glue] module namespace not found in ${helperName}(): ${namespace}`
    )
    return null
  }

  return {
    state: module.context.state,
    commit: module.context.commit,
    dispatch: module.context.dispatch,
    namespace
  }
}

function isObject(obj) {
  return obj !== null && typeof obj === 'object'
}

function findInstalledNamespace(component) {
  if (component.$options[GLUED_NAMESPACE_OPTION]) {
    return component.$options[GLUED_NAMESPACE_OPTION]
  }

  if (!component.$parent) {
    return null
  }

  return findInstalledNamespace(component.$parent)
}
