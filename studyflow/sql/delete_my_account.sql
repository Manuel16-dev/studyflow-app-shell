-- Lets a signed-in user delete their own account. Callable by authenticated users only.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
