create or replace function public.themes_validate_tokens()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  key text;
  val jsonb;
  allowed text[] := array[
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
    '--color-hover-foreground',
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
begin
  if jsonb_typeof(new.tokens) <> 'object' then
    raise exception 'theme tokens must be an object';
  end if;

  for key, val in select * from jsonb_each(new.tokens)
  loop
    if not (key = any (allowed)) then
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

drop trigger if exists themes_validate_tokens on public.themes;
create trigger themes_validate_tokens
  before insert or update on public.themes
  for each row
  execute function public.themes_validate_tokens();

revoke all on function public.themes_validate_tokens() from public;
revoke all on function public.themes_validate_tokens() from anon, authenticated;
grant execute on function public.themes_validate_tokens() to postgres, service_role;
