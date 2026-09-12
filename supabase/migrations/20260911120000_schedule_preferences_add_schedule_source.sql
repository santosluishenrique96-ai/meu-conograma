-- Migration: adiciona coluna `schedule_source` a public.schedule_preferences
-- Objetivo: distinguir origem do cronograma:
--   'app' = sugerido/configurado pelo Meu Cronograma (pode receber ajustes automáticos futuros)
--   'own' = cronograma próprio da usuária definido manualmente (NÃO é sobrescrito automaticamente)
--
-- Rollback (reversível):
--   ALTER TABLE public.schedule_preferences DROP CONSTRAINT schedule_preferences_schedule_source_check;
--   ALTER TABLE public.schedule_preferences DROP COLUMN schedule_source;
--
-- Idempotente: segura para reaplicar se a alteração já tiver sido aplicada manualmente no remoto.

-- Passo 1: Adiciona a coluna com DEFAULT e NOT NULL (preenche AUTOMATICAMENTE rows existentes com 'app')
alter table public.schedule_preferences
  add column if not exists schedule_source text not null default 'app';

-- Passo 2: CHECK constraint para garantir somente valores permitidos (após todas as rows já estarem válidas)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedule_preferences_schedule_source_check'
      and conrelid = 'public.schedule_preferences'::regclass
  ) then
    alter table public.schedule_preferences
      add constraint schedule_preferences_schedule_source_check
      check (schedule_source in ('app', 'own'));
  end if;
end
$$;
