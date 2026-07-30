ALTER TABLE public.evolution_photos ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE public.evolution_photos
SET storage_path = split_part(image_url, '/evolution-photos/', 2)
WHERE storage_path IS NULL
  AND image_url LIKE '%/evolution-photos/%';