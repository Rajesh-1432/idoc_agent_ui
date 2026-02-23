import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const Layout = lazy(() => import('./pages/Layout'))
const Demo1 = lazy(() => import('./components/Demo1'))
const Demo2 = lazy(() => import('./components/Demo2'))
const SupportAgent = lazy(() => import('./components/SupportAgent.jsx'))

const Loading = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600">{text}</span>
    </div>
  </div>
)

const App = () => {
  const router = createBrowserRouter([{
    path: "/",
    element: (
      <Suspense fallback={<Loading text="Loading App..." />}>
        <Layout />
      </Suspense>
    ),
    children: [{
      path: "/",
      element: (
        <Suspense fallback={<Loading text="Loading Support Agent..." />}>
          <SupportAgent />
        </Suspense>
      )
    },
    {
      path: "/demo2",
      element: (
        <Suspense fallback={<Loading text="Loading Demo2..." />}>
          <Demo2 />
        </Suspense>
      )
    }]
  }])

  return <RouterProvider router={router} />
}

export default App