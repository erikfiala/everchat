-- Dual light/dark color palettes + optional icon pack on published themes.

alter table public.themes
  add column if not exists icon_pack text not null default 'lu';

alter table public.themes
  drop constraint if exists themes_icon_pack;

alter table public.themes
  add constraint themes_icon_pack check (icon_pack in ('lu', 'fi', 'hi2', 'tb', 'pi'));

create or replace function public.themes_validate_tokens()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  key text;
  val jsonb;
  palette_key text;
  palette_val jsonb;
  size_keys text[] := array[
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--font-size',
    '--font-size-sm',
    '--font-size-lg',
    '--border-width',
    '--space-pad',
    '--space-margin',
    '--space-composer-pad'
  ];
  color_keys text[] := array[
    '--color-background',
    '--color-foreground',
    '--color-muted',
    '--color-muted-foreground',
    '--color-border',
    '--color-card',
    '--color-primary',
    '--color-primary-foreground',
    '--color-accent',
    '--color-anonymous-avatar',
    '--color-destructive',
    '--color-success',
    '--color-score-pos',
    '--color-score-neg',
    '--color-ring',
    '--color-hover-background',
    '--color-hover-border',
    '--color-hover-foreground'
  ];
  n numeric;
  has_light boolean := new.tokens ? 'light';
  has_dark boolean := new.tokens ? 'dark';
begin
  if jsonb_typeof(new.tokens) <> 'object' then
    raise exception 'theme tokens must be an object';
  end if;

  if has_light or has_dark then
    if not has_light or not has_dark then
      raise exception 'theme tokens must include both light and dark palettes';
    end if;
    if jsonb_typeof(new.tokens->'light') <> 'object'
      or jsonb_typeof(new.tokens->'dark') <> 'object' then
      raise exception 'theme palettes must be objects';
    end if;

    for key, val in select * from jsonb_each(new.tokens)
    loop
      if key in ('light', 'dark') then
        for palette_key, palette_val in select * from jsonb_each(val)
        loop
          if not (palette_key = any (color_keys)) then
            raise exception 'unknown theme color %', palette_key;
          end if;
          if jsonb_typeof(palette_val) <> 'string'
            or (palette_val #>> '{}') !~ '^#[0-9A-Fa-f]{6}$' then
            raise exception 'invalid color for %', palette_key;
          end if;
        end loop;
      elsif key = any (size_keys) then
        if jsonb_typeof(val) <> 'number' then
          raise exception 'invalid size for %', key;
        end if;
        n := (val #>> '{}')::numeric;
        if key in ('--radius-sm', '--radius-md', '--radius-lg') then
          if n < 0 or n > 32 then raise exception 'out of range %', key; end if;
        elsif key = '--font-size' then
          if n < 10 or n > 24 then raise exception 'out of range %', key; end if;
        elsif key = '--font-size-sm' then
          if n < 10 or n > 22 then raise exception 'out of range %', key; end if;
        elsif key = '--font-size-lg' then
          if n < 12 or n > 28 then raise exception 'out of range %', key; end if;
        elsif key = '--border-width' then
          if n < 0 or n > 8 then raise exception 'out of range %', key; end if;
        else
          if n < 0 or n > 48 then raise exception 'out of range %', key; end if;
        end if;
      else
        raise exception 'unknown theme token %', key;
      end if;
    end loop;
    return new;
  end if;

  for key, val in select * from jsonb_each(new.tokens)
  loop
    if not (key = any (color_keys || size_keys)) then
      raise exception 'unknown theme token %', key;
    end if;
    if key = any (color_keys) then
      if jsonb_typeof(val) <> 'string' or (val #>> '{}') !~ '^#[0-9A-Fa-f]{6}$' then
        raise exception 'invalid color for %', key;
      end if;
    else
      if jsonb_typeof(val) <> 'number' then
        raise exception 'invalid size for %', key;
      end if;
      n := (val #>> '{}')::numeric;
      if key in ('--radius-sm', '--radius-md', '--radius-lg') then
        if n < 0 or n > 32 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size' then
        if n < 10 or n > 24 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size-sm' then
        if n < 10 or n > 22 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size-lg' then
        if n < 12 or n > 28 then raise exception 'out of range %', key; end if;
      elsif key = '--border-width' then
        if n < 0 or n > 8 then raise exception 'out of range %', key; end if;
      else
        if n < 0 or n > 48 then raise exception 'out of range %', key; end if;
      end if;
    end if;
  end loop;

  return new;
end;
$$;
