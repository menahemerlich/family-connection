-- Direct INSERT into families from SSR can hit RLS when PostgREST does not see a JWT
-- (auth.uid() null) even though auth.getUser() succeeded. Same pattern as accept_invitation.

create or replace function public.create_family_for_user(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  n text := trim(p_name);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if n = '' then
    raise exception 'name required';
  end if;

  insert into public.families (name, owner_id)
  values (n, uid)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_family_for_user(text) to authenticated;
