import { AppRouter } from './routes/router'
import { ThemeProvider } from './lib/theme'

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  )
}
