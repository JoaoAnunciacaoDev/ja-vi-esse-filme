import { useState, useEffect } from 'react'
import { getUserProfile, followUser, unfollowUser } from '@/api/social'
import type { UserProfile } from '@/types/social'
import {
  X,
  Flame,
  Trophy,
  BookOpen,
  Users,
  Lock,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

interface UserProfileModalProps {
  username: string | null
  onClose: () => void
  onFollowChanged?: () => void
}

export function UserProfileModal({ username, onClose, onFollowChanged }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  useEffect(() => {
    if (!username) return

    let isMounted = true
    setIsLoading(true)
    setError(null)

    getUserProfile(username)
      .then((data) => {
        if (isMounted) setProfile(data)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Erro ao carregar perfil')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [username])

  if (!username) return null

  const handleToggleFollow = async () => {
    if (!profile || profile.is_self || isFollowLoading) return

    setIsFollowLoading(true)
    try {
      if (profile.is_following || profile.is_pending) {
        await unfollowUser(profile.username)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                is_pending: false,
                followers_count: Math.max(0, prev.followers_count - (prev.is_following ? 1 : 0)),
              }
            : null
        )
      } else {
        const res = await followUser(profile.username)
        const isAccepted = res.status === 'accepted'
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                is_following: isAccepted,
                is_pending: !isAccepted,
                followers_count: isAccepted ? prev.followers_count + 1 : prev.followers_count,
              }
            : null
        )
      }
      onFollowChanged?.()
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar seguidor')
    } finally {
      setIsFollowLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="shrink-0 relative bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 p-4 sm:p-6 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
              Carregando perfil do leitor...
            </div>
          ) : error || !profile ? (
            <div className="py-8 text-center text-rose-400 text-sm">
              {error || 'Não foi possível carregar o perfil.'}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold flex items-center justify-center text-3xl shadow-lg border-2 border-emerald-500/20 shrink-0">
                {profile.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>

              {/* Informações básicas */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">{profile.display_name}</h2>
                  <span className="text-xs text-slate-400 font-mono">@{profile.username}</span>
                  {profile.is_private && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      Privado
                    </span>
                  )}
                </div>

                {profile.bio ? (
                  <p className="text-xs text-slate-300 mb-3 max-w-md">{profile.bio}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic mb-3">Membro do Já Vi Esse Filme</p>
                )}

                {/* Contadores Sociais */}
                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      <strong className="text-white font-semibold">{profile.followers_count}</strong> seguidores
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>
                      <strong className="text-white font-semibold">{profile.following_count}</strong> seguindo
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 hidden sm:flex">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Botão Seguir */}
              {!profile.is_self && (
                <div className="shrink-0 self-center sm:self-start">
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      profile.is_following
                        ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-slate-700'
                        : profile.is_pending
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isFollowLoading
                      ? 'Processando...'
                      : profile.is_following
                      ? 'Seguindo'
                      : profile.is_pending
                      ? 'Solicitado'
                      : 'Seguir'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo do Perfil */}
        {profile && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
            {!profile.can_view_full ? (
              <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Este perfil é privado</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Siga este leitor para ter acesso à sua estante pessoal, conquistas e histórico de leitura.
                </p>
              </div>
            ) : (
              <>
                {/* Métricas do Cinéfilo */}
                {profile.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-3.5 text-center">
                      <div className="text-amber-400 flex items-center justify-center gap-1 mb-1">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span className="text-base font-extrabold">{profile.stats.total_movies_watched}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Filmes Vistos</span>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-3.5 text-center">
                      <div className="text-cyan-400 flex items-center justify-center gap-1 mb-1">
                        <Trophy className="w-4 h-4 text-cyan-400" />
                        <span className="text-base font-extrabold">{profile.stats.total_episodes_watched}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Episódios</span>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-3.5 text-center">
                      <div className="text-emerald-400 flex items-center justify-center gap-1 mb-1">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span className="text-base font-extrabold">{profile.stats.total_reviews}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Avaliações</span>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-3.5 text-center">
                      <div className="text-yellow-400 flex items-center justify-center gap-1 mb-1">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-base font-extrabold">
                          {profile.stats.avg_rating > 0 ? profile.stats.avg_rating.toFixed(1) : '-'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Nota Média</span>
                    </div>
                  </div>
                )}

                {/* Aba Videoteca */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Videoteca Pública ({profile.library?.length || 0})
                  </h4>
                  {profile.library && profile.library.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.library.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-2xl hover:border-slate-700 transition"
                        >
                          {item.media?.poster_url ? (
                            <img
                              src={item.media.poster_url}
                              alt={item.media.title}
                              className="w-12 h-16 object-cover rounded-lg shadow shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-slate-700/60 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{item.media?.title || 'Título'}</h4>
                            <p className="text-[11px] text-slate-400 truncate">{item.media?.year}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                item.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : item.status === 'watching'
                                  ? 'bg-cyan-500/10 text-cyan-400'
                                  : 'bg-amber-500/10 text-amber-300'
                              }`}>
                                {item.status === 'completed'
                                  ? 'Já Vi'
                                  : item.status === 'watching'
                                  ? 'Assistindo'
                                  : 'Quero Ver'}
                              </span>
                              {item.status === 'completed' && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">Nenhum título público na videoteca.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
