-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. MOVIES TABLE (Curated Data)
create table public.movies (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  poster_path text, -- URL to image
  backdrop_path text, -- URL to larger image
  release_year int,
  genre text[], -- Array of genres e.g. ['Action', 'Sci-Fi']
  category text, -- Curated category e.g. 'Top 100', 'Horror', 'RomCom'
  overview text,
  imdb_rating numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ROOMS TABLE (Session Management)
create table public.rooms (
  id text primary key, -- 4-character code e.g. 'ABCD'
  created_by uuid references auth.users(id),
  status text default 'waiting' check (status in ('waiting', 'active', 'finished')),
  mode text default 'dual' check (mode in ('solo', 'dual')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  started_at timestamp with time zone -- For the timer sync
);

-- 3. PARTICIPANTS TABLE (Users in a Room)
create table public.participants (
  id uuid default uuid_generate_v4() primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id), -- Nullable for anonymous users if we go that route, but better to use auth.uid()
  is_ready boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

-- 4. SWIPES TABLE (Real-time Interactions)
create table public.swipes (
  id uuid default uuid_generate_v4() primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  movie_id uuid references public.movies(id) not null,
  direction text check (direction in ('left', 'right')), -- 'right' = like, 'left' = pass
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. MATCHES VIEW (Optional, but helps with "Mutual Likes")
-- A match exists if BOTH users in a room swiped 'right' on the same movie.
-- (For MVP, we can handle this in application logic or a simple query)

-- RLS POLICIES (Security)
alter table public.movies enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.swipes enable row level security;

-- Movies are readable by everyone, writable only by service_role (admin)
create policy "Movies are public" on public.movies for select using (true);

-- Rooms: Anyone can create (if auth), Members can view
create policy "Anyone can create a room" on public.rooms for insert with check (auth.uid() = created_by);
create policy "Room members can view their room" on public.rooms for select using (true); -- Simplified for MVP. Ideally: exists(select 1 from participants where room_id = rooms.id and user_id = auth.uid())
create policy "Room creator can update status" on public.rooms for update using (auth.uid() = created_by);

-- Participants: 
create policy "Users can join rooms" on public.participants for insert with check (auth.uid() = user_id);
create policy "Users can view participants in their room" on public.participants for select using (true);
create policy "Users can update their own status" on public.participants for update using (auth.uid() = user_id);

-- Swipes:
create policy "Users can insert their own swipes" on public.swipes for insert with check (auth.uid() = user_id);
create policy "Users can view swipes in their room" on public.swipes for select using (
  exists (
    select 1 from public.participants p 
    where p.room_id = swipes.room_id 
    and p.user_id = auth.uid()
  )
);

-- SEED DATA (Sample Curated List)
insert into public.movies (title, release_year, genre, category, poster_path, overview, imdb_rating) values
('Inception', 2010, ARRAY['Sci-Fi', 'Action'], 'Mind Benders', 'https://image.tmdb.org/t/p/w500/9gk7admal4OlWIkIOXkwEsVRcZl.jpg', 'A thief who steals corporate secrets through the use of dream-sharing technology...', 8.8),
('The Grand Budapest Hotel', 2014, ARRAY['Comedy', 'Drama'], 'Aesthetic', 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg', 'A writer encounters the owner of an aging high-class hotel...', 8.1),
('Interstellar', 2014, ARRAY['Sci-Fi', 'Adventure'], 'Mind Benders', 'https://image.tmdb.org/t/p/w500/gEU2QniL6C8zEfVfy23rUnOMu05.jpg', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.', 8.6),
('Parasite', 2019, ARRAY['Thriller', 'Drama'], 'Global Hits', 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', 8.5),
('Spirited Away', 2001, ARRAY['Animation', 'Family'], 'Animation', 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGnSxQbUgZ.jpg', 'A young girl, Chihiro, becomes trapped in a strange new world of spirits...', 8.6),
('The Dark Knight', 2008, ARRAY['Action', 'Crime'], 'Top Rated', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham...', 9.0),
('Pulp Fiction', 1994, ARRAY['Crime', 'Drama'], 'Classics', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine...', 8.9),
('La La Land', 2016, ARRAY['Comedy', 'Drama', 'Romance'], 'Romance', 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWzExZ53XvL0n00ZqGw.jpg', 'Mia, an aspiring actress, serves lattes to movie stars in between auditions and Sebastian, a jazz musician, scrapes by playing cocktail party gigs...', 8.0),
('Get Out', 2017, ARRAY['Mystery', 'Thriller', 'Horror'], 'Horror', 'https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfWD24NvqDbHL.jpg', 'Chris and his girlfriend Rose go upstate to visit her parents for the weekend...', 7.7),
('Mad Max: Fury Road', 2015, ARRAY['Action', 'Adventure', 'Sci-Fi'], 'Action', 'https://image.tmdb.org/t/p/w500/8tZYtuWezpWIKdwh1Mkt0tr9GYj.jpg', 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler...', 8.1);
