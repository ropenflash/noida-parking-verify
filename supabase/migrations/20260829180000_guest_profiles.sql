create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      case
        when coalesce(new.is_anonymous, false) then 'Guest'
        else nullif(split_part(coalesce(new.email, ''), '@', 1), '')
      end
    )
  );
  perform private.write_audit(
    'PROFILE_CREATED',
    'profiles',
    new.id,
    null,
    jsonb_build_object('id', new.id, 'guest', coalesce(new.is_anonymous, false))
  );
  return new;
end;
$$;
