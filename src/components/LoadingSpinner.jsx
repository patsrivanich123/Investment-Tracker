export default function LoadingSpinner({ fullscreen = false }) {
  if (fullscreen) {
    return (
      <div className="min-h-dvh bg-app-bg flex items-center justify-center">
        <Spinner />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner />
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
  )
}
