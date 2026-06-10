-- Rejilla Mundialera — Fase 2 (rareza social). Ejecutar UNA vez en el SQL Editor de
-- Supabase. Hasta entonces, el juego funciona con la puntuación local (la capa social
-- es no bloqueante: lib/rejilla/social.ts devuelve null si esto no existe).
--
-- Modelo: conteo agregado por (grid del día, celda, jugador) + total por celda.
-- La ÚNICA escritura expuesta al cliente anónimo es la función rejilla_pick (SECURITY
-- DEFINER): incrementa de forma atómica y devuelve (n, total). No se permite INSERT/
-- UPDATE directo, para mitigar abuso (la app no tiene cuentas de usuario).

create table if not exists public.rejilla_picks (
  grid_id   text    not null,        -- clave del día (YYYY-MM-DD)
  cell      text    not null,        -- índice de celda "0".."8"
  player_id text    not null,
  n         integer not null default 0,
  primary key (grid_id, cell, player_id)
);

create table if not exists public.rejilla_cell_totals (
  grid_id text    not null,
  cell    text    not null,
  total   integer not null default 0,
  primary key (grid_id, cell)
);

-- Incremento atómico + lectura. Devuelve la fila {n, total} para esa celda+jugador.
create or replace function public.rejilla_pick(p_grid text, p_cell text, p_player text)
returns table (n integer, total integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rejilla_picks (grid_id, cell, player_id, n)
    values (p_grid, p_cell, p_player, 1)
  on conflict (grid_id, cell, player_id)
    do update set n = public.rejilla_picks.n + 1;

  insert into public.rejilla_cell_totals (grid_id, cell, total)
    values (p_grid, p_cell, 1)
  on conflict (grid_id, cell)
    do update set total = public.rejilla_cell_totals.total + 1;

  return query
    select pk.n, tt.total
    from public.rejilla_picks pk
    join public.rejilla_cell_totals tt
      on tt.grid_id = pk.grid_id and tt.cell = pk.cell
    where pk.grid_id = p_grid and pk.cell = p_cell and pk.player_id = p_player;
end;
$$;

-- RLS: lectura pública de los agregados (no son datos sensibles, permiten mostrar el
-- % al recargar el Diario sin volver a incrementar). La ESCRITURA sigue bloqueada al
-- acceso directo: solo ocurre dentro de la función rejilla_pick (SECURITY DEFINER).
alter table public.rejilla_picks       enable row level security;
alter table public.rejilla_cell_totals enable row level security;

create policy "leer picks"   on public.rejilla_picks       for select using (true);
create policy "leer totales" on public.rejilla_cell_totals for select using (true);

grant select  on public.rejilla_picks, public.rejilla_cell_totals to anon, authenticated;
grant execute on function public.rejilla_pick(text, text, text)    to anon, authenticated;
