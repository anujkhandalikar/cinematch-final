export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            rooms: {
                Row: {
                    code: string
                    created_at: string
                    status: 'waiting' | 'active' | 'finished'
                    mode: 'solo' | 'dual'
                }
                Insert: {
                    code: string
                    created_at?: string
                    status?: 'waiting' | 'active' | 'finished'
                    mode?: 'solo' | 'dual'
                }
                Update: {
                    code?: string
                    created_at?: string
                    status?: 'waiting' | 'active' | 'finished'
                    mode?: 'solo' | 'dual'
                }
            }
            participants: {
                Row: {
                    id: string
                    room_code: string
                    user_id: string
                    last_seen: string
                }
                Insert: {
                    id?: string
                    room_code: string
                    user_id: string
                    last_seen?: string
                }
                Update: {
                    id?: string
                    room_code?: string
                    user_id?: string
                    last_seen?: string
                }
            }
            swipes: {
                Row: {
                    id: number
                    room_code: string
                    user_id: string
                    movie_id: string
                    direction: 'left' | 'right'
                    created_at: string
                }
                Insert: {
                    id?: number
                    room_code: string
                    user_id: string
                    movie_id: string
                    direction: 'left' | 'right'
                    created_at?: string
                }
                Update: {
                    id?: number
                    room_code?: string
                    user_id?: string
                    movie_id?: string
                    direction?: 'left' | 'right'
                    created_at?: string
                }
            }
        }
    }
}
