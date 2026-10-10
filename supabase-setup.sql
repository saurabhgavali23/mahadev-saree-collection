-- ==============================================================================
-- MAHADEV SAREE COLLECTION - SUPABASE DATABASE SETUP SCRIPT (WITH VIDEO SUPPORT)
-- ==============================================================================
-- Run this complete script in the Supabase SQL Editor:
-- Supabase Dashboard -> Your Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE SAREES TABLE (Full Schema with Video Support)
-- ------------------------------------------------------------------------------
create table if not exists public.sarees (
  id bigint generated always as identity primary key,
  name text not null,
  fabric text,
  color text,
  pattern text,
  border text,
  category text,
  occasion text,
  description text,
  price numeric not null check (price >= 0),
  shipping_charges numeric default 0 check (shipping_charges >= 0),
  images text[] default '{}'::text[], -- First element is primary cover image
  video_url text,                     -- URL to uploaded MP4/WebM or YouTube link
  video_poster text,                  -- First frame poster thumbnail URL
  status text not null default 'Available' check (status in ('Available', 'Sold')),
  created_at timestamptz not null default now()
);

-- Migration for existing databases (safe to run multiple times):
alter table public.sarees add column if not exists shipping_charges numeric default 0 check (shipping_charges >= 0);

-- Performance Indexes
create index if not exists idx_sarees_category on public.sarees (category);
create index if not exists idx_sarees_fabric on public.sarees (fabric);
create index if not exists idx_sarees_status on public.sarees (status);
create index if not exists idx_sarees_price on public.sarees (price);
create index if not exists idx_sarees_created_at on public.sarees (created_at desc);


-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) FOR SAREES TABLE
-- ------------------------------------------------------------------------------
alter table public.sarees enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public sarees are viewable by everyone" on public.sarees;
drop policy if exists "Authenticated admins can insert sarees" on public.sarees;
drop policy if exists "Authenticated admins can update sarees" on public.sarees;
drop policy if exists "Authenticated admins can delete sarees" on public.sarees;

-- RLS: Public can view sarees
create policy "Public sarees are viewable by everyone"
  on public.sarees for select using (true);

-- RLS: Only logged-in admin can insert, update, delete sarees
create policy "Authenticated admins can insert sarees"
  on public.sarees for insert to authenticated with check (true);

create policy "Authenticated admins can update sarees"
  on public.sarees for update to authenticated using (true) with check (true);

create policy "Authenticated admins can delete sarees"
  on public.sarees for delete to authenticated using (true);


-- ------------------------------------------------------------------------------
-- 3. STORAGE BUCKET: saree-images (Public, JPEG/PNG/WebP)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('saree-images', 'saree-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public saree images are viewable by everyone" on storage.objects;
drop policy if exists "Authenticated admins can upload saree images" on storage.objects;
drop policy if exists "Authenticated admins can update saree images" on storage.objects;
drop policy if exists "Authenticated admins can delete saree images" on storage.objects;

create policy "Public saree images are viewable by everyone"
  on storage.objects for select using (bucket_id = 'saree-images');

create policy "Authenticated admins can upload saree images"
  on storage.objects for insert to authenticated with check (bucket_id = 'saree-images');

create policy "Authenticated admins can update saree images"
  on storage.objects for update to authenticated using (bucket_id = 'saree-images');

create policy "Authenticated admins can delete saree images"
  on storage.objects for delete to authenticated using (bucket_id = 'saree-images');


-- ------------------------------------------------------------------------------
-- 4. STORAGE BUCKET: saree-videos (Public, Max 15 MB, MP4/WebM only)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'saree-videos',
  'saree-videos',
  true,
  15728640, -- 15 Megabytes = 15 * 1024 * 1024
  array['video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = array['video/mp4', 'video/webm'];

drop policy if exists "Public saree videos are viewable by everyone" on storage.objects;
drop policy if exists "Authenticated admins can upload saree videos" on storage.objects;
drop policy if exists "Authenticated admins can update saree videos" on storage.objects;
drop policy if exists "Authenticated admins can delete saree videos" on storage.objects;

create policy "Public saree videos are viewable by everyone"
  on storage.objects for select using (bucket_id = 'saree-videos');

create policy "Authenticated admins can upload saree videos"
  on storage.objects for insert to authenticated with check (bucket_id = 'saree-videos');

create policy "Authenticated admins can update saree videos"
  on storage.objects for update to authenticated using (bucket_id = 'saree-videos');

create policy "Authenticated admins can delete saree videos"
  on storage.objects for delete to authenticated using (bucket_id = 'saree-videos');


-- ------------------------------------------------------------------------------
-- 5. INITIAL SEED SAREES (With Sample Video)
-- ------------------------------------------------------------------------------
insert into public.sarees (name, fabric, color, pattern, border, category, occasion, description, price, images, video_url, video_poster, status, created_at)
select
  'Kanjivaram Pure Silk Saree with Gold Zari Pallu',
  'Pure Silk',
  'Crimson Red',
  'Floral Jaal',
  'Contrast Temple Border',
  'Bridal',
  'Wedding / Reception',
  'Magnificent heirloom Kanjivaram silk saree woven with 2g pure gold zari. Features intricate peacock and chakra motifs along the traditional korvai border. Paired with a running unstitched blouse piece.',
  14500,
  array[
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'
  ],
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
  'Available',
  now() - interval '2 days'
where not exists (select 1 from public.sarees where name like 'Kanjivaram Pure Silk Saree%');

insert into public.sarees (name, fabric, color, pattern, border, category, occasion, description, price, images, video_url, video_poster, status, created_at)
select
  'Banarasi Katan Silk Saree in Emerald Green',
  'Banarasi Silk',
  'Emerald Green',
  'Kadwa Buti',
  'Rich Meenakari Zari Border',
  'Festive',
  'Festivals / Sangeet',
  'Handcrafted Banarasi katan silk saree featuring delicate floral kadwa butas across the body and an opulent meenakari zari border. Comes with matching brocade blouse piece.',
  8900,
  array[
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80'
  ],
  null,
  null,
  'Available',
  now() - interval '3 days'
where not exists (select 1 from public.sarees where name like 'Banarasi Katan Silk%');


-- ==============================================================================
-- 4. CREATE SAREE REVIEWS TABLE (Admin-Managed Customer Reviews with Photos & Video)
-- ==============================================================================
create table if not exists public.saree_reviews (
  id bigint generated always as identity primary key,
  saree_id bigint not null references public.sarees(id) on delete cascade,
  customer_name text not null,
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  comment text not null,
  photos text[] default '{}'::text[],
  video_url text,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_saree_reviews_saree_id on public.saree_reviews (saree_id);
create index if not exists idx_saree_reviews_created_at on public.saree_reviews (created_at desc);

-- Row Level Security (RLS)
alter table public.saree_reviews enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public reviews are viewable by everyone" on public.saree_reviews;
drop policy if exists "Authenticated admins can insert reviews" on public.saree_reviews;
drop policy if exists "Authenticated admins can update reviews" on public.saree_reviews;
drop policy if exists "Authenticated admins can delete reviews" on public.saree_reviews;

-- Public can view reviews
create policy "Public reviews are viewable by everyone"
  on public.saree_reviews for select using (true);

-- Only logged-in admin can insert, update, delete reviews
create policy "Authenticated admins can insert reviews"
  on public.saree_reviews for insert to authenticated with check (true);

create policy "Authenticated admins can update reviews"
  on public.saree_reviews for update to authenticated using (true) with check (true);

create policy "Authenticated admins can delete reviews"
  on public.saree_reviews for delete to authenticated using (true);


-- ==============================================================================
-- 5. SAREE DIMENSIONS & SECURE PRIVATE TABLE (COST PRICE & ORIGINAL MESSAGE)
-- ==============================================================================
-- Optional dimensions and color variants on public sarees table:
alter table public.sarees add column if not exists length_m numeric;
alter table public.sarees add column if not exists width_in numeric;
alter table public.sarees add column if not exists blouse text;
alter table public.sarees add column if not exists available_colors text[] default '{}'::text[];

-- ------------------------------------------------------------------------------
-- Private table: saree_private
-- Stores confidential supplier buying cost and raw pasted WhatsApp message.
-- Strictly restricted: NO public read access. Only authenticated admins have access.
-- Cascading delete: when a saree is deleted, its private row is automatically removed.
-- ------------------------------------------------------------------------------
create table if not exists public.saree_private (
  saree_id bigint primary key references public.sarees(id) on delete cascade,
  cost_price numeric check (cost_price >= 0),
  original_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Performance Index
create index if not exists idx_saree_private_saree_id on public.saree_private (saree_id);

-- Row Level Security (RLS)
alter table public.saree_private enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Authenticated admins can select saree_private" on public.saree_private;
drop policy if exists "Authenticated admins can insert saree_private" on public.saree_private;
drop policy if exists "Authenticated admins can update saree_private" on public.saree_private;
drop policy if exists "Authenticated admins can delete saree_private" on public.saree_private;
drop policy if exists "Public cannot view saree_private" on public.saree_private;

-- RLS: Authenticated admin only policies (Public has NO SELECT policy, completely hidden)
create policy "Authenticated admins can select saree_private"
  on public.saree_private for select to authenticated using (true);

create policy "Authenticated admins can insert saree_private"
  on public.saree_private for insert to authenticated with check (true);

create policy "Authenticated admins can update saree_private"
  on public.saree_private for update to authenticated using (true) with check (true);

create policy "Authenticated admins can delete saree_private"
  on public.saree_private for delete to authenticated using (true);


