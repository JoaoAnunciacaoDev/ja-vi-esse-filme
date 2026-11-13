import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { MediaCatalogPage } from '@/features/media/MediaCatalogPage'
import { WatchlistPage } from '@/features/watchlist/WatchlistPage'
import { DiaryPage } from '@/features/diary/DiaryPage'
import { LogMediaModal } from '@/features/diary/LogMediaModal'
import { Footer } from '@/components/layout/Footer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotFoundPage } from '@/components/NotFoundPage'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
import {
  buildTabUrl,
  resolveAppRoute,
  type AppRoute,
  type AppTab,
} from '@/utils/routing'
import {
  Film,
  Compass,
  Bookmark,
  BarChart3,
  Loader2,
  LogOut,
  RefreshCw,
  Users,
  Settings,
  ShieldCheck,
  Bell,
  Sparkles,
  WifiOff,
} from 'lucide-react'

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const SocialPage = lazy(() =>
  import('@/features/social/SocialPage').then((m) => ({ default: m.SocialPage }))
)
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const PrivacySettingsModal = lazy(() =>
  import('@/features/social/PrivacySettingsModal').then((m) => ({ default: m.PrivacySettingsModal }))
)
const PatchNotesModal = lazy(() =>
  import('@/features/patchNotes/PatchNotesModal').then((m) => ({ default: m.PatchNotesModal }))
)
const NotificationSettingsModal = lazy(() =>
  import('@/features/notifications/NotificationSettingsModal').then((m) => ({
    default: m.NotificationSettingsModal,
  }))
)

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      <span className="text-xs font-medium">Carregando conteúdo...</span>
    </div>
  )
}

interface AuthenticatedAppProps {
  currentTab: AppTab
  onSelectTab: (tab: AppTab) => void
  route: AppRoute
}

function AuthenticatedApp({ currentTab, onSelectTab, route }: AuthenticatedAppProps) {
  const { user, logout, connectionError, isReconnecting, refreshUser } = useAuth()
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  // Estado do Modal de Registrar Sessão / Experiência
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [selectedMediaForLog, setSelectedMediaForLog] = useState<MediaItem | ExternalMediaResult | undefined>()

  const handleOpenLogModal = (media?: MediaItem | ExternalMediaResult) => {
    setSelectedMediaForLog(media)
    setIsLogModalOpen(true)
  }

  const isSuperUser = user?.role === 'SUPERUSER'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => onSelectTab('catalog')}
            >
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Film className="w-6 h-6" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white hidden sm:inline">
                Já Vi Esse Filme
              </span>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onSelectTab('catalog')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'catalog'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Explorar</span>
              </button>

              <button
                onClick={() => onSelectTab('library')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'library'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Minha Lista</span>
              </button>

              <button
                onClick={() => onSelectTab('journal')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'journal'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Diário</span>
              </button>

              <button
                onClick={() => onSelectTab('dashboard')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Estatísticas</span>
              </button>

              <button
                onClick={() => onSelectTab('social')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'social'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Comunidade</span>
              </button>

              {/* Botão de Painel Admin exclusivo para SUPERUSER */}
              {isSuperUser && (
                <button
                  onClick={() => onSelectTab('admin')}
                  className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Ações Rápidas */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenLogModal()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition cursor-pointer shadow-md shadow-rose-500/20"
            >
              <span>+ Já Vi</span>
            </button>

            {/* Patch Notes */}
            <button
              onClick={() => setIsPatchNotesOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
              title="Novidades da Plataforma (Patch Notes)"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Lembretes */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition cursor-pointer"
              title="Configurações de Notificações"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Perfil & Privacidade */}
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800/60 hover:bg-slate-800 pl-2 pr-3 py-1.5 rounded-full border border-slate-700/50 text-xs transition cursor-pointer"
              title="Configurações de Perfil e Privacidade"
            >
              <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-[11px]">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="font-medium text-slate-200 hidden xs:inline">{user?.display_name}</span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {connectionError && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{connectionError}</span>
            </div>
            <button
              type="button"
              onClick={() => refreshUser()}
              disabled={isReconnecting}
              className="inline-flex items-center space-x-1.5 self-start sm:self-auto px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
            </button>
          </div>
        )}

        <ErrorBoundary fallbackTitle="Ocorreu um erro ao carregar esta página">
          <Suspense fallback={<TabLoadingFallback />}>
            {route.kind === 'not_found' ? (
              <NotFoundPage
                path={route.path}
                isAuthenticated
                onGoHome={() => onSelectTab('catalog')}
              />
            ) : currentTab === 'library' ? (
              <WatchlistPage
                onOpenLogModal={handleOpenLogModal}
                onNavigateToCatalog={() => onSelectTab('catalog')}
              />
            ) : currentTab === 'journal' ? (
              <DiaryPage
                onOpenLogModal={handleOpenLogModal}
                onNavigateToCatalog={() => onSelectTab('catalog')}
              />
            ) : currentTab === 'dashboard' ? (
              <DashboardPage />
            ) : currentTab === 'social' ? (
              <SocialPage />
            ) : currentTab === 'admin' ? (
              isSuperUser ? <AdminPage /> : <MediaCatalogPage onOpenLogModal={handleOpenLogModal} />
            ) : (
              <MediaCatalogPage onOpenLogModal={handleOpenLogModal} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Rodapé */}
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      {/* Barra de Navegação Inferior (Mobile PWA) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onSelectTab('catalog')}
          aria-label="Explorar Filmes e Séries"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'catalog'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Explorar</span>
        </button>

        <button
          onClick={() => onSelectTab('library')}
          aria-label="Minha Lista"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'library'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Lista</span>
        </button>

        <button
          onClick={() => onSelectTab('journal')}
          aria-label="Diário de Sessões"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'journal'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Diário</span>
        </button>

        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label="Estatísticas Cinéfilas"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Stats</span>
        </button>

        <button
          onClick={() => onSelectTab('social')}
          aria-label="Comunidade"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'social'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Social</span>
        </button>

        {isSuperUser && (
          <button
            onClick={() => onSelectTab('admin')}
            aria-label="Painel de Administração"
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
              currentTab === 'admin'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-indigo-400/80 hover:text-indigo-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">Admin</span>
          </button>
        )}
      </nav>

      {/* Modais */}
      <Suspense fallback={null}>
        <LogMediaModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false)
            setSelectedMediaForLog(undefined)
          }}
          initialMedia={selectedMediaForLog}
        />

        {isPrivacyModalOpen && (
          <PrivacySettingsModal onClose={() => setIsPrivacyModalOpen(false)} />
        )}

        {isPatchNotesOpen && (
          <PatchNotesModal onClose={() => setIsPatchNotesOpen(false)} />
        )}

        {isNotificationsOpen && (
          <NotificationSettingsModal onClose={() => setIsNotificationsOpen(false)} />
        )}
      </Suspense>
    </div>
  )
}

function Main() {
  const { isAuthenticated, isLoading, connectionError, isReconnecting, refreshUser, dismissConnectionError } = useAuth()
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveAppRoute(window.location.pathname, window.location.search)
  )

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(resolveAppRoute(window.location.pathname, window.location.search))
    }

    window.addEventListener('popstate', syncFromLocation)

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JAVIESSEFILME_NAVIGATE' && typeof event.data.url === 'string') {
        const parsed = new URL(event.data.url, window.location.origin)
        window.history.pushState({}, '', parsed.pathname + parsed.search)
        setRoute(resolveAppRoute(parsed.pathname, parsed.search))
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage)
      navigator.serviceWorker
        .getRegistration('/sw.js')
        .then((reg) => reg?.update().catch(() => {}))
        .catch(() => {})
    }

    return () => {
      window.removeEventListener('popstate', syncFromLocation)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage)
      }
    }
  }, [])

  const handleSelectTab = (tab: AppTab) => {
    const targetUrl = buildTabUrl(tab)
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({}, '', targetUrl)
    }
    setRoute({ kind: 'tab', tab })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center space-y-4 max-w-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-950/20 animate-pulse">
            <Film className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-white tracking-wide">Já Vi Esse Filme</h1>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Verificando sessão...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="relative">
        {connectionError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 text-xs text-amber-200 shadow-2xl">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{connectionError}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => refreshUser()}
                disabled={isReconnecting}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isReconnecting ? 'Tentando...' : 'Reconectar'}
              </button>
              <button
                type="button"
                onClick={() => dismissConnectionError()}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <AuthPage />
      </div>
    )
  }

  return (
    <AuthenticatedApp
      currentTab={route.kind === 'tab' ? route.tab : 'catalog'}
      onSelectTab={handleSelectTab}
      route={route}
    />
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
