-- Remove Ferris Bueller's Day Off (1986) and Clueless (1995) from Something Light & Fun
-- These older titles are being removed per product decision.
delete from public.movies
where id in ('fun_4', 'fun_9');
