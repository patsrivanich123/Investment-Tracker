import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EntryPage from './pages/EntryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import GoalPage from './pages/GoalPage'
import SettingsPage from './pages/SettingsPage'

function AppRoutes() {
  const { user, loading } = useApp()

  if (loading) return <LoadingSpinner fullscreen />
  if (!user) return <LoginPage />

  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<DashboardPage />} />
        <Route path="/entry"     element={<EntryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/goal"      element={<GoalPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
