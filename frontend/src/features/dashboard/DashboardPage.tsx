import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api/stats'
import { Film, Tv, Star, Repeat, Calendar, BarChart3, Loader2 } from 'lucide-react'

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats-dashboard'],
    queryFn: () => statsApi.getDashboard(),
  })

  const { data: heatmap } = useQuery({
    queryKey: ['stats-heatmap'],
    queryFn: () => statsApi.getHeatmap(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const overview = stats?.overview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <span>Estatísticas Cinéfilas</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Panorama das suas experiências assistindo filmes, séries e episódios.
        </p>
      </div>

      {/* Grid de Métricas Principais */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Filmes Vistos</span>
              <Film className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">{overview.total_movies}</div>
            <p className="text-[11px] text-slate-500">{overview.watched_this_year} neste ano</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Episódios de Séries</span>
              <Tv className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-white">{overview.total_episodes}</div>
            <p className="text-[11px] text-slate-500">{overview.watching} séries em andamento</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Média de Notas</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {overview.avg_rating > 0 ? overview.avg_rating.toFixed(1) : '-'}
            </div>
            <p className="text-[11px] text-slate-500">de 5.0 estrelas</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Reassistidos</span>
              <Repeat className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">{overview.total_rewatches}</div>
            <p className="text-[11px] text-slate-500">rewatches registrados</p>
          </div>
        </div>
      )}

      {/* Grid: Plataformas & Histórico Mensal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Onde você mais assiste */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-emerald-400" />
            <span>Onde você mais assiste</span>
          </h2>

          {stats?.platforms && stats.platforms.length > 0 ? (
            <div className="space-y-3">
              {stats.platforms.map((p) => {
                const total = overview?.total_logs || 1
                const percent = Math.round((p.count / total) * 100)

                return (
                  <div key={p.platform} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{p.platform}</span>
                      <span className="text-slate-400">{p.count} títulos ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum dado de plataforma registrado ainda.</p>
          )}
        </div>

        {/* Ritmo nos Últimos Meses */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Ritmo nos últimos meses</span>
          </h2>

          {stats?.monthly && stats.monthly.length > 0 ? (
            <div className="flex items-end justify-between gap-2 h-44 pt-6">
              {stats.monthly.map((m) => {
                const maxCount = Math.max(...stats.monthly.map((x) => x.count), 1)
                const heightPercent = Math.max(10, Math.round((m.count / maxCount) * 100))

                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-300">{m.count}</span>
                    <div className="w-full max-w-[36px] bg-slate-950 rounded-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-xl transition-all duration-500"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">Sem dados de meses anteriores.</p>
          )}
        </div>
      </div>

      {/* Heatmap Anual */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Frequência no Ano</span>
          </h2>
          <span className="text-xs text-slate-500">
            {heatmap?.days?.length || 0} dias com sessões registradas
          </span>
        </div>

        {heatmap?.days && heatmap.days.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {heatmap.days.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} sessões`}
                className={`w-3.5 h-3.5 rounded-sm transition ${
                  d.count >= 3
                    ? 'bg-emerald-400'
                    : d.count === 2
                    ? 'bg-emerald-500'
                    : 'bg-emerald-700'
                }`}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">
            Comece a registrar seus filmes para preencher o mapa de sessões!
          </p>
        )}
      </div>
    </div>
  )
}
