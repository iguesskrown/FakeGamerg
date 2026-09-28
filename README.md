# 🎮 FakeGamerG Portfolio Website

A modern and responsive portfolio website showcasing the work of **Arpit Yadav (FakeGamerG)** — Minecraft Player, YouTube Creator, and Professional Minecraft Thumbnail Designer.

## Creator thumbnail uploads

The private creator studio is at `/admin.html`. It uses Supabase Authentication, Storage, and Realtime so the featured thumbnail updates for visitors without a redeploy. The portfolio keeps its bundled thumbnail until Supabase is configured.

### Supabase setup

1. Create a Supabase project. In **Authentication**, turn off public sign-ups and create the FakeGamerG creator account. Do not share its password.
2. Open the SQL editor and run the setup below. Replace `CREATOR_AUTH_USER_UUID` with the creator account's **User UID** from Authentication → Users.
3. Copy the project URL and anon/public key from Project Settings → API into `scripts/supabase-config.js`. The anon key is intended to be public; never put a service-role key in this website.
4. Deploy the site over HTTPS. Open `/admin.html`, sign in as the creator, and upload. Only the UID added to `thumbnail_admins` can upload or change the featured image.

```sql
create table if not exists public.thumbnail_admins (
	user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.thumbnail_admins enable row level security;
drop policy if exists "Admins can read their own entry" on public.thumbnail_admins;
create policy "Admins can read their own entry"
	on public.thumbnail_admins for select to authenticated
	using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.thumbnail_admins from anon, authenticated;

create or replace function public.is_thumbnail_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.thumbnail_admins
		where user_id = (select auth.uid())
	);
$$;
revoke all on function public.is_thumbnail_admin() from public, anon;
grant execute on function public.is_thumbnail_admin() to authenticated;

create table if not exists public.site_settings (
	id text primary key check (id = 'featured'),
	featured_thumbnail text,
	updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values ('featured') on conflict (id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
	on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Creator can update site settings" on public.site_settings;
create policy "Creator can update site settings"
	on public.site_settings for update to authenticated
	using (public.is_thumbnail_admin())
	with check (public.is_thumbnail_admin());
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-thumbnails', 'site-thumbnails', true, 15728640,
				array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 15728640,
	allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Anyone can view site thumbnails" on storage.objects;
create policy "Anyone can view site thumbnails"
	on storage.objects for select to anon, authenticated
	using (bucket_id = 'site-thumbnails');
drop policy if exists "Creator can upload site thumbnails" on storage.objects;
create policy "Creator can upload site thumbnails"
	on storage.objects for insert to authenticated
	with check (bucket_id = 'site-thumbnails' and public.is_thumbnail_admin());

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'site_settings'
	) then
		alter publication supabase_realtime add table public.site_settings;
	end if;
end;
$$;

insert into public.thumbnail_admins (user_id)
values ('CREATOR_AUTH_USER_UUID');
```

:Heart:
