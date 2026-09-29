-- Imported translation IDs may have no generated default or be ahead of it.
-- Never overwrite existing IDs or replace another configured default.
do $$
declare
  id_sequence text;
  id_type oid;
  id_default text;
  id_identity text;
  highest_id bigint;
  sequence_value bigint;
  sequence_called boolean;
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.regimen_traducciones'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
  ) then
    raise exception 'Verify the primary key of public.regimen_traducciones before repairing its sequence';
  end if;

  lock table public.regimen_traducciones in access exclusive mode;
  select a.atttypid, pg_get_expr(d.adbin, d.adrelid), a.attidentity
    into id_type, id_default, id_identity
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.regimen_traducciones'::regclass
      and a.attname = 'id' and not a.attisdropped;

  if id_type not in ('smallint'::regtype, 'integer'::regtype, 'bigint'::regtype) then
    raise exception 'public.regimen_traducciones.id is not an integer column';
  end if;

  id_sequence := pg_get_serial_sequence('public.regimen_traducciones', 'id');
  if id_sequence is null then
    if id_default like 'nextval(%'
      and id_default = format('nextval(%L::regclass)', split_part(id_default, '''', 2)) then
      -- The column uses a sequence that was never marked as owned by it.
      id_sequence := split_part(id_default, '''', 2);
      if to_regclass(id_sequence) is null then
        raise exception 'The sequence used by public.regimen_traducciones.id does not exist';
      end if;
      execute format('alter sequence %s owned by public.regimen_traducciones.id', id_sequence::regclass);
    elsif id_default is not null or id_identity <> '' then
      raise exception 'Inspect the existing id default (%) before associating a sequence', id_default;
    else
      create sequence if not exists public.regimen_traducciones_id_seq;
      alter sequence public.regimen_traducciones_id_seq owned by public.regimen_traducciones.id;
      alter table public.regimen_traducciones
        alter column id set default nextval('public.regimen_traducciones_id_seq'::regclass);
      id_sequence := pg_get_serial_sequence('public.regimen_traducciones', 'id');
    end if;
  end if;

  execute format('grant usage, select on sequence %s to authenticated', id_sequence::regclass);
  select max(id) into highest_id from public.regimen_traducciones;
  execute format('select last_value, is_called from %s', id_sequence::regclass)
    into sequence_value, sequence_called;

  if highest_id is not null and highest_id >= 1
    and (highest_id > sequence_value or (highest_id = sequence_value and not sequence_called)) then
    perform setval(id_sequence::regclass, highest_id, true);
  end if;
end;
$$;
