create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

create table public.collections (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(btrim(name)) between 1 and 200),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint collections_id_user_id_key unique (id, user_id)
);

create table public.songs (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	collection_id uuid not null,
	title text not null check (char_length(btrim(title)) between 1 and 200),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint songs_collection_id_user_id_fkey
		foreign key (collection_id, user_id)
		references public.collections (id, user_id)
		on delete cascade,
	constraint songs_id_user_id_key unique (id, user_id),
	constraint songs_id_collection_id_user_id_key unique (id, collection_id, user_id)
);

create table public.note_files (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	song_id uuid not null,
	storage_provider text not null check (char_length(btrim(storage_provider)) > 0),
	storage_key text not null check (char_length(btrim(storage_key)) > 0),
	original_filename text not null check (char_length(btrim(original_filename)) > 0),
	mime_type text not null check (char_length(btrim(mime_type)) > 0),
	page_count integer not null check (page_count > 0),
	created_at timestamptz not null default timezone('utc', now()),
	constraint note_files_song_id_user_id_fkey
		foreign key (song_id, user_id)
		references public.songs (id, user_id)
		on delete cascade,
	constraint note_files_id_user_id_key unique (id, user_id),
	constraint note_files_id_song_id_user_id_key unique (id, song_id, user_id),
	constraint note_files_user_id_storage_key_key unique (user_id, storage_key)
);

create table public.note_pages (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	song_id uuid not null,
	note_file_id uuid not null,
	page_number integer not null check (page_number > 0),
	sort_order integer not null check (sort_order >= 0),
	preview_key text,
	created_at timestamptz not null default timezone('utc', now()),
	constraint note_pages_song_id_user_id_fkey
		foreign key (song_id, user_id)
		references public.songs (id, user_id)
		on delete cascade,
	constraint note_pages_note_file_id_song_id_user_id_fkey
		foreign key (note_file_id, song_id, user_id)
		references public.note_files (id, song_id, user_id)
		on delete cascade,
	constraint note_pages_song_id_sort_order_key unique (song_id, sort_order),
	constraint note_pages_note_file_id_page_number_key unique (note_file_id, page_number)
);

create index collections_user_id_created_at_idx on public.collections (user_id, created_at desc);
create index songs_user_id_collection_id_created_at_idx
	on public.songs (user_id, collection_id, created_at desc);
create index songs_collection_id_created_at_idx on public.songs (collection_id, created_at desc);
create index note_files_user_id_song_id_created_at_idx
	on public.note_files (user_id, song_id, created_at desc);
create index note_pages_user_id_song_id_sort_order_idx
	on public.note_pages (user_id, song_id, sort_order);
create index note_pages_note_file_id_page_number_idx on public.note_pages (note_file_id, page_number);

create trigger set_collections_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

create trigger set_songs_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

alter table public.collections enable row level security;
alter table public.collections force row level security;

create policy "Users can view their own collections"
on public.collections
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own collections"
on public.collections
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own collections"
on public.collections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own collections"
on public.collections
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.songs enable row level security;
alter table public.songs force row level security;

create policy "Users can view their own songs"
on public.songs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own songs"
on public.songs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own songs"
on public.songs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own songs"
on public.songs
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.note_files enable row level security;
alter table public.note_files force row level security;

create policy "Users can view their own note files"
on public.note_files
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own note files"
on public.note_files
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own note files"
on public.note_files
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own note files"
on public.note_files
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.note_pages enable row level security;
alter table public.note_pages force row level security;

create policy "Users can view their own note pages"
on public.note_pages
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own note pages"
on public.note_pages
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own note pages"
on public.note_pages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own note pages"
on public.note_pages
for delete
to authenticated
using (auth.uid() = user_id);
