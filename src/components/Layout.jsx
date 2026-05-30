import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div className="min-h-dvh bg-app-bg flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-nav">{children}</main>
      <BottomNav />
    </div>
  )
}
