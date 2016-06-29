import Express from 'express'
import React from 'react'
import ReactDOM from 'react-dom/server'
import config from './config'

import createStore from './redux/create'
import ApiClient from './helpers/ApiClient'
import Html from './helpers/Html'
import getRoutes from './routes'

import { Provider } from 'react-redux'
import { syncHistoryWithStore } from 'react-router-redux'
import createHistory from 'react-router/lib/createMemoryHistory'
import { match } from 'react-router'
import { ReduxAsyncConnect, loadOnServer } from 'redux-connect'

const app = new Express()

app.use((req, res) => {
  if (__DEVELOPMENT__) {
    // Do not cache webpack stats: the script file would change since
    // hot module replacement is enabled in the development env
    webpackIsomorphicTools.refresh()
  }
  const client = new ApiClient(req)
  const memoryHistory = createHistory(req.originalUrl)
  const store = createStore(memoryHistory, client)
  const history = syncHistoryWithStore(memoryHistory, store)

  function hydrateOnClient() {
    res.send('<!doctype html>\n' +
      ReactDOM.renderToString(<Html assets={webpackIsomorphicTools.assets()} store={store} />))
  }

  if (__DISABLE_SSR__) {
    hydrateOnClient()
    return
  }

  match({ history, routes: getRoutes(), location: req.url }, (error, redirectLocation, renderProps) => {
    if (error) {
      res.status(500).send(error.message)
    } else if (redirectLocation) {
      res.redirect(302, redirectLocation.pathname + redirectLocation.search)
    } else if (renderProps) {
      loadOnServer({ ...renderProps, store }).then(() => {
        const component = (
          <Provider store={store} key="provider">
            <ReduxAsyncConnect {...renderProps} />
          </Provider>
        )

        res.status(200)
        res.send('<!doctype html>\n' +
          ReactDOM.renderToString(<Html assets={webpackIsomorphicTools.assets()} component={component} store={store} />))
      })

    } else {
      res.status(404).send('Not found')
    }
  })
})

if (config.port) {
  app.listen(config.port, err => {
    if (err) {
      console.error(err)
    }
    console.info('----\n==> ✅  %s is running, talking to API server on %s.', config.app.title, config.apiPort)
    console.info('==> 💻  Open http://%s:%s in a browser to view the app.', config.host, config.port)
  })
} else {
  console.error('==>     ERROR: No PORT environment variable has been specified')
}
