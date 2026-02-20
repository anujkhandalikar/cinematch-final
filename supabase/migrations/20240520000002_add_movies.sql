-- Drop the old movies table (from supabase_schema.sql, used UUID IDs)
drop table if exists public.movies cascade;

-- Create Movies table
create table public.movies (
  id text primary key,
  title text not null,
  poster_url text not null,
  genre text[] not null,
  year int not null,
  overview text not null,
  imdb_rating numeric not null,
  mood text not null check (mood in ('imdb_top', 'light_and_fun', 'bollywood')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.movies enable row level security;

-- Movies are publicly readable (no auth needed)
create policy "Movies are publicly readable"
  on public.movies for select
  using (true);

-- Add to realtime publication
alter publication supabase_realtime add table public.movies;

-- ─── Seed: IMDb Rated Top (10 movies) ─────────────────────────────────────────
insert into public.movies (id, title, poster_url, genre, year, overview, imdb_rating, mood) values
('imdb_1', 'The Shawshank Redemption', 'https://image.tmdb.org/t/p/w500/9cjIGRQL1r6UKGiGSCnHKIBq5SB.jpg', ARRAY['Drama'], 1994, 'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.', 9.3, 'imdb_top'),
('imdb_2', 'The Godfather', 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', ARRAY['Crime', 'Drama'], 1972, 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', 9.2, 'imdb_top'),
('imdb_3', 'The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', ARRAY['Action', 'Crime', 'Drama'], 2008, 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 9.0, 'imdb_top'),
('imdb_4', 'Pulp Fiction', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', ARRAY['Crime', 'Drama'], 1994, 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', 8.9, 'imdb_top'),
('imdb_5', 'Inception', 'https://image.tmdb.org/t/p/w500/9gk7admal4zlH35Ke3txs0w506y.jpg', ARRAY['Sci-Fi', 'Thriller'], 2010, 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 8.8, 'imdb_top'),
('imdb_6', 'Forrest Gump', 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', ARRAY['Drama', 'Romance'], 1994, 'A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.', 8.8, 'imdb_top'),
('imdb_7', 'The Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', ARRAY['Sci-Fi', 'Action'], 1999, 'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.', 8.7, 'imdb_top'),
('imdb_8', 'Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniL6C8zEfVfy23rUnKEtp.jpg', ARRAY['Sci-Fi', 'Drama'], 2014, 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.', 8.6, 'imdb_top'),
('imdb_9', 'Fight Club', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', ARRAY['Drama', 'Thriller'], 1999, 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.', 8.8, 'imdb_top'),
('imdb_10', 'Schindler''s List', 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', ARRAY['Drama', 'History'], 1993, 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.', 9.0, 'imdb_top');

-- ─── Seed: Something Light and Fun (10 movies) ───────────────────────────────
insert into public.movies (id, title, poster_url, genre, year, overview, imdb_rating, mood) values
('fun_1', 'The Grand Budapest Hotel', 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg', ARRAY['Comedy', 'Drama'], 2014, 'The adventures of Gustave H, a legendary concierge at a famous European hotel between the wars, and Zero Moustafa, the lobby boy who becomes his most trusted friend.', 8.1, 'light_and_fun'),
('fun_2', 'Superbad', 'https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg', ARRAY['Comedy'], 2007, 'Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.', 7.6, 'light_and_fun'),
('fun_3', 'Mean Girls', 'https://image.tmdb.org/t/p/w500/fXm3YKXAEjx7d2tIWDC9OJREbGZ.jpg', ARRAY['Comedy'], 2004, 'Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels.', 7.1, 'light_and_fun'),
('fun_4', 'Ferris Bueller''s Day Off', 'https://image.tmdb.org/t/p/w500/9LTQMiTyKPITLnJdrjPpdBXJFyz.jpg', ARRAY['Comedy'], 1986, 'A high school wise guy is determined to have a day off from school, despite what the Principal thinks of that.', 7.8, 'light_and_fun'),
('fun_5', 'The Hangover', 'https://image.tmdb.org/t/p/w500/uluhlXubGu1VxU63X9VHCLWDAYP.jpg', ARRAY['Comedy'], 2009, 'Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing.', 7.7, 'light_and_fun'),
('fun_6', 'Legally Blonde', 'https://image.tmdb.org/t/p/w500/ljeUiaiEYgqfVbA3pQ1VIFeyVPB.jpg', ARRAY['Comedy', 'Romance'], 2001, 'Elle Woods, a fashionable sorority queen, is dumped by her boyfriend. She decides to follow him to law school. While she is there, she figures out that there is more to her than just looks.', 6.4, 'light_and_fun'),
('fun_7', 'Bridesmaids', 'https://image.tmdb.org/t/p/w500/gFadDjMcwBJIcb0y8VIBjK7l2ry.jpg', ARRAY['Comedy'], 2011, 'Competition between the maid of honor and a bridesmaid over who is the bride''s best friend threatens to upend the life of an idealistic woman.', 6.8, 'light_and_fun'),
('fun_8', 'Crazy Rich Asians', 'https://image.tmdb.org/t/p/w500/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg', ARRAY['Comedy', 'Romance', 'Drama'], 2018, 'An economics professor accompanies her boyfriend to Singapore for his best friend''s wedding, only to be thrust into the spotlight of Southeast Asia''s most influential family.', 6.9, 'light_and_fun'),
('fun_9', 'Clueless', 'https://image.tmdb.org/t/p/w500/8AwVTcgpTnmeqNpIzSj7gkVOLBT.jpg', ARRAY['Comedy', 'Romance'], 1995, 'A rich high school student tries to boost a new pupil''s popularity, but reckons without the other girl''s taste and personality.', 6.9, 'light_and_fun'),
('fun_10', 'Zootopia', 'https://image.tmdb.org/t/p/w500/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg', ARRAY['Animation', 'Comedy', 'Family'], 2016, 'In a city of anthropomorphic animals, a rookie bunny cop and a cynical con artist fox must work together to uncover a conspiracy.', 8.0, 'light_and_fun');

-- ─── Seed: Bollywood (10 movies) ─────────────────────────────────────────────
insert into public.movies (id, title, poster_url, genre, year, overview, imdb_rating, mood) values
('bolly_1', '3 Idiots', 'https://image.tmdb.org/t/p/w500/66A9MqXOyVFAkO1bc3JSMUhSHtx.jpg', ARRAY['Comedy', 'Drama'], 2009, 'Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.', 8.4, 'bollywood'),
('bolly_2', 'Dilwale Dulhania Le Jayenge', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', ARRAY['Drama', 'Romance', 'Musical'], 1995, 'When Raj meets Simran in Europe, it isn''t love at first sight but when Simran moves to India for an arranged marriage, love makes its presence felt.', 8.1, 'bollywood'),
('bolly_3', 'Dangal', 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', ARRAY['Action', 'Biography', 'Drama'], 2016, 'Former wrestler Mahavir Singh Phogat trains his daughters Geeta and Babita to become India''s first world-class female wrestlers.', 8.4, 'bollywood'),
('bolly_4', 'Gully Boy', 'https://image.tmdb.org/t/p/w500/1DDAaIIcNMyMGTn0IoVpJ8USVkT.jpg', ARRAY['Drama', 'Music'], 2019, 'A coming-of-age story about an aspiring street rapper from the slums of Mumbai.', 7.9, 'bollywood'),
('bolly_5', 'Zindagi Na Milegi Dobara', 'https://image.tmdb.org/t/p/w500/v1eCAaiclAOHJkXLzQSL7B2G3e7.jpg', ARRAY['Comedy', 'Drama', 'Romance'], 2011, 'Three friends decide to turn their fantasy vacation into reality after one of their friends gets engaged.', 8.1, 'bollywood'),
('bolly_6', 'Dil Chahta Hai', 'https://image.tmdb.org/t/p/w500/qHtMxFO0a7UaIn9nJAl0FMcqhB3.jpg', ARRAY['Comedy', 'Drama', 'Romance'], 2001, 'Three inseparable childhood friends are just out of college. Nothing comes between them, until they each fall in love.', 8.1, 'bollywood'),
('bolly_7', 'Queen', 'https://image.tmdb.org/t/p/w500/8pnCOsJjin4IWafHOBOqZU2jGi0.jpg', ARRAY['Comedy', 'Drama'], 2014, 'A Delhi girl from a traditional family sets out on a solo honeymoon after her fiancé calls off their wedding. What follows is an eye-opening experience.', 8.2, 'bollywood'),
('bolly_8', 'Andhadhun', 'https://image.tmdb.org/t/p/w500/lyLpHJdoBNahkpHZhn6TVVnIiAW.jpg', ARRAY['Crime', 'Thriller'], 2018, 'A series of mysterious events change the life of a blind pianist, who must now report a crime that he should technically know nothing about.', 8.3, 'bollywood'),
('bolly_9', 'Lagaan', 'https://image.tmdb.org/t/p/w500/hUPkHjprffpoWWzQmUaXTb6hGKl.jpg', ARRAY['Drama', 'Musical', 'Sport'], 2001, 'The people of a small village in Victorian India stake their future on a game of cricket against their ruthless British rulers.', 8.1, 'bollywood'),
('bolly_10', 'Bajrangi Bhaijaan', 'https://image.tmdb.org/t/p/w500/nkRqQuo53OyAVDVkNNqaek2WNKP.jpg', ARRAY['Comedy', 'Drama'], 2015, 'An Indian man with a magnanimous heart takes a young mute Pakistani girl back to her homeland to re-unite her with her family.', 8.0, 'bollywood');
