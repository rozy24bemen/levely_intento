export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

export type Post = {
  id: string
  content: string
  created_at: string
  likes_count: number
  media_url: string | null
  profiles: Profile | null
}

export type PostWithProfile = {
  id: string
  content: string
  created_at: string
  likes_count: number
  media_url: string | null
  profiles: Profile
}
