import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('FBPly recovered from a render error.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary">
          <div className="error-card">
            <img src="/fbply-f-mark.png" alt="FBPly" />
            <h1>Something did not load smoothly.</h1>
            <p>Your information is still safe. Refresh the app and FBPly will try again calmly.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh app
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
