-- Family Connection — initial schema, RLS, storage, realtime

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.family_role as enum ('admin', 'member');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.conversation_type as enum ('family', 'direct');
create type public.media_type as enum ('none', 'image', 'video', 'audio');

  -- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  birth_date date,
  preferred_locale text not null default 'he' check (preferred_locale in ('he', 'en')),
  last_active_family_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_last_active_family_idx on public.profiles (last_active_family_id);

-- -----------------------------------------------------------------------------
-- Families & membership
-- -----------------------------------------------------------------------------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.family_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create index family_members_user_idx on public.family_members (user_id);
create index family_members_family_idx on public.family_members (family_id);

alter table public.profiles
  add constraint profiles_last_active_family_fk
  foreign key (last_active_family_id) references public.families (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Invitations
-- -----------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index invitations_family_idx on public.invitations (family_id);

-- -----------------------------------------------------------------------------
-- Conversations
-- -----------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  type public.conversation_type not null,
  dm_user_a uuid references auth.users (id) on delete cascade,
  dm_user_b uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint direct_participants_ck check (
    type <> 'direct'
    or (dm_user_a is not null and dm_user_b is not null and dm_user_a < dm_user_b)
  )
);

create unique index conversations_one_family_chat
  on public.conversations (family_id)
  where type = 'family';

create unique index conversations_direct_pair
  on public.conversations (family_id, dm_user_a, dm_user_b)
  where type = 'direct';

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index conversation_participants_user_idx
  on public.conversation_participants (user_id);

-- -----------------------------------------------------------------------------
-- Messages & reactions
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text,
  media_type public.media_type not null default 'none',
  storage_path text,
  reply_to_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- -----------------------------------------------------------------------------
-- Gallery
-- -----------------------------------------------------------------------------
create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  event_tag text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  title text,
  storage_path text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index gallery_items_album_idx on public.gallery_items (album_id);

-- -----------------------------------------------------------------------------
-- Calendar
-- -----------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  reminder_minutes_before int,
  created_at timestamptz not null default now()
);

create index calendar_events_family_starts_idx
  on public.calendar_events (family_id, starts_at);

-- -----------------------------------------------------------------------------
-- Notification preferences (global / per-family / per-conversation)
-- -----------------------------------------------------------------------------
create table public.user_notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  global_mute boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.user_muted_families (
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  primary key (user_id, family_id)
);

create table public.user_muted_conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  primary key (user_id, conversation_id)
);

-- -----------------------------------------------------------------------------
-- Helpers: is_family_member
-- -----------------------------------------------------------------------------
create or replace function public.is_family_member(fid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = uid
  );
$$;

grant execute on function public.is_family_member(uuid, uuid) to authenticated;

create or replace function public.owner_or_admin(fid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.families f where f.id = fid and f.owner_id = uid
  )
  or exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = uid and m.role = 'admin'
  );
$$;

grant execute on function public.owner_or_admin(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers: new user profile
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, preferred_locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'he')
  );
  insert into public.user_notification_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Triggers: family chat bootstrap
-- -----------------------------------------------------------------------------
create or replace function public.after_family_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  insert into public.conversations (family_id, type)
  values (new.id, 'family')
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, new.owner_id);

  insert into public.family_members (family_id, user_id, role)
  values (new.id, new.owner_id, 'admin');
  return new;
end;
$$;

create trigger families_create_chat
  after insert on public.families
  for each row execute function public.after_family_insert();

create or replace function public.after_family_member_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  select c.id into conv_id
  from public.conversations c
  where c.family_id = new.family_id and c.type = 'family'
  limit 1;

  if conv_id is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, new.user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger family_members_join_chat
  after insert on public.family_members
  for each row execute function public.after_family_member_insert();

-- -----------------------------------------------------------------------------
-- RPC: accept invitation
-- -----------------------------------------------------------------------------
create or replace function public.accept_invitation(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  v_user uuid := auth.uid();
  v_email text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select email into v_email from auth.users where id = v_user;
  select * into inv
  from public.invitations
  where token = invite_token
    and status = 'pending'
    and expires_at > now();

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  if lower(trim(inv.email)) <> lower(trim(v_email)) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (inv.family_id, v_user, 'member')
  on conflict (family_id, user_id) do nothing;

  update public.invitations
  set status = 'accepted'
  where id = inv.id;

  return jsonb_build_object('ok', true, 'family_id', inv.family_id);
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get or create direct conversation (ordered user ids)
-- -----------------------------------------------------------------------------
create or replace function public.get_or_create_direct_conversation(
  p_family_id uuid,
  p_other_user uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_family_member(p_family_id, me) then
    raise exception 'not a family member';
  end if;
  if not public.is_family_member(p_family_id, p_other_user) then
    raise exception 'other user not in family';
  end if;

  if me = p_other_user then
    raise exception 'cannot dm self';
  end if;

  if me < p_other_user then
    a := me; b := p_other_user;
  else
    a := p_other_user; b := me;
  end if;

  select id into conv_id
  from public.conversations
  where family_id = p_family_id
    and type = 'direct'
    and dm_user_a = a
    and dm_user_b = b;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (family_id, type, dm_user_a, dm_user_b)
  values (p_family_id, 'direct', a, b)
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, a), (conv_id, b)
  on conflict (conversation_id, user_id) do nothing;

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invitations enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_items enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_notification_settings enable row level security;
alter table public.user_muted_families enable row level security;
alter table public.user_muted_conversations enable row level security;

-- profiles
create policy profiles_select_visible
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.id
    )
  );

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- families
create policy families_select_member
  on public.families for select to authenticated
  using (public.is_family_member(id, auth.uid()));

create policy families_insert_authenticated
  on public.families for insert to authenticated
  with check (owner_id = auth.uid());

create policy families_update_admin
  on public.families for update to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.family_members m
      where m.family_id = families.id and m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- family_members
create policy family_members_select_same_family
  on public.family_members for select to authenticated
  using (public.is_family_member(family_id, auth.uid()));

create policy family_members_insert_owner_admin
  on public.family_members for insert to authenticated
  with check (public.owner_or_admin(family_id, auth.uid()));

create policy family_members_delete_admin
  on public.family_members for delete to authenticated
  using (
    public.owner_or_admin(family_id, auth.uid())
    and user_id <> (select f.owner_id from public.families f where f.id = family_id)
  );

-- invitations
create policy invitations_select_admin
  on public.invitations for select to authenticated
  using (public.owner_or_admin(family_id, auth.uid()));

create policy invitations_insert_admin
  on public.invitations for insert to authenticated
  with check (public.owner_or_admin(family_id, auth.uid()));

create policy invitations_update_admin
  on public.invitations for update to authenticated
  using (public.owner_or_admin(family_id, auth.uid()));

-- conversations (inserts via security definer triggers/RPC only)
create policy conversations_select_member
  on public.conversations for select to authenticated
  using (public.is_family_member(family_id, auth.uid()));

-- conversation_participants
create policy conv_part_select
  on public.conversation_participants for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.is_family_member(c.family_id, auth.uid())
    )
  );

create policy conv_part_insert
  on public.conversation_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.is_family_member(c.family_id, auth.uid())
    )
  );

-- messages
create policy messages_select_participant
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

create policy messages_insert_participant
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

-- message_reactions
create policy reactions_select
  on public.message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.conversation_participants p on p.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id and p.user_id = auth.uid()
    )
  );

create policy reactions_insert_own
  on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy reactions_update_own
  on public.message_reactions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reactions_delete_own
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- gallery
create policy albums_crud
  on public.gallery_albums for all to authenticated
  using (public.is_family_member(family_id, auth.uid()))
  with check (public.is_family_member(family_id, auth.uid()));

create policy items_crud
  on public.gallery_items for all to authenticated
  using (public.is_family_member(family_id, auth.uid()))
  with check (public.is_family_member(family_id, auth.uid()));

-- calendar
create policy calendar_crud
  on public.calendar_events for all to authenticated
  using (public.is_family_member(family_id, auth.uid()))
  with check (public.is_family_member(family_id, auth.uid()));

-- notification settings
create policy notif_settings_own
  on public.user_notification_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy muted_families_own
  on public.user_muted_families for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy muted_conv_own
  on public.user_muted_conversations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime: supabase_realtime publication (messages)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages' and schemaname = 'public'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Storage bucket (policies applied via SQL on storage.objects)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('family-media', 'family-media', false)
on conflict (id) do nothing;

create policy family_media_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'family-media'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.family_id::text
    )
  );

create policy family_media_write
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'family-media'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.family_id::text
    )
  );

create policy family_media_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'family-media'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.family_id::text
    )
  );

create policy family_media_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'family-media'
    and exists (
      select 1 from public.family_members m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.family_id::text
    )
  );
