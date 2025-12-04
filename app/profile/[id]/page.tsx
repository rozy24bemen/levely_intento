import { createClient } from '@/lib/supabase/serverClient'
import { notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import ProfileHeader from '@/components/ProfileHeader'
import ProfileStats from '@/components/ProfileStats'
import AchievementsGrid from '@/components/AchievementsGrid'
import type { Post } from '@/lib/types'
import type { Achievement } from '@/components/AchievementCard'

type ProfilePageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', id)
    .single()

  return {
    title: profile ? `${profile.username} - LEVELY` : 'Perfil - LEVELY',
    description: `Perfil de ${profile?.username || 'usuario'} en LEVELY`,
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  // Get profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Get user's posts
  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      likes_count,
      comments_count,
      media_url,
      profiles!posts_author_id_fkey (
        id,
        username,
        avatar_url,
        level
      )
    `)
    .eq('author_id', id)
    .order('created_at', { ascending: false })

  const posts = postsData?.map((post: any) => ({
    ...post,
    profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  })) as Post[] | null

  // Get stats
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', id)

  const { data: likesData } = await supabase
    .from('posts')
    .select('likes_count')
    .eq('author_id', id)
  
  const totalLikes = likesData?.reduce((sum, post) => sum + post.likes_count, 0) || 0

  const { count: achievementsCount } = await supabase
    .from('user_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)

  // Get all achievements with unlock status
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')
    .order('trigger_value', { ascending: true })

  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id, awarded_at')
    .eq('user_id', id)

  // Map achievements with unlock status
  const achievementsWithStatus: Achievement[] = (allAchievements || []).map((achievement) => {
    const userAchievement = userAchievements?.find(
      (ua) => ua.achievement_id === achievement.id
    )
    return {
      ...achievement,
      unlocked: !!userAchievement,
      awarded_at: userAchievement?.awarded_at,
    }
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Profile Header */}
        <ProfileHeader 
          profile={profile} 
          isOwnProfile={isOwnProfile}
          currentUserId={user?.id}
        />

        {/* Stats */}
        <ProfileStats
          postsCount={postsCount || 0}
          likesCount={totalLikes}
          achievementsCount={achievementsCount || 0}
          level={profile.level}
          xp={profile.xp}
        />

        {/* Achievements Section */}
        <div className="mt-8">
          <AchievementsGrid
            achievements={achievementsWithStatus}
            unlockedCount={achievementsCount || 0}
            totalCount={allAchievements?.length || 0}
          />
        </div>

        {/* Posts Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isOwnProfile ? 'Mis Publicaciones' : 'Publicaciones'}
          </h2>
          
          {posts && posts.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500">
                {isOwnProfile 
                  ? 'Aún no has publicado nada. ¡Comparte tu primer post!'
                  : 'Este usuario aún no ha publicado nada.'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
