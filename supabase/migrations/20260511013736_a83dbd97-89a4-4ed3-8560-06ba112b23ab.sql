-- Evolution photos
CREATE TABLE public.evolution_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  note TEXT,
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evolution_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own photos" ON public.evolution_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own photos" ON public.evolution_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own photos" ON public.evolution_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own photos" ON public.evolution_photos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_evolution_photos_user ON public.evolution_photos(user_id, taken_at DESC);

-- Schedule preferences
CREATE TABLE public.schedule_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  hair_type TEXT,
  goal TEXT,
  monday TEXT NOT NULL DEFAULT 'Hidratação',
  tuesday TEXT NOT NULL DEFAULT 'Descanso',
  wednesday TEXT NOT NULL DEFAULT 'Nutrição',
  thursday TEXT NOT NULL DEFAULT 'Descanso',
  friday TEXT NOT NULL DEFAULT 'Hidratação',
  saturday TEXT NOT NULL DEFAULT 'Reconstrução',
  sunday TEXT NOT NULL DEFAULT 'Cuidado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.schedule_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.schedule_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.schedule_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_schedule_preferences_updated_at
BEFORE UPDATE ON public.schedule_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evolution-photos', 'evolution-photos', true);

CREATE POLICY "Evolution photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'evolution-photos');
CREATE POLICY "Users upload own evolution photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evolution-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own evolution photos" ON storage.objects FOR UPDATE USING (bucket_id = 'evolution-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own evolution photos" ON storage.objects FOR DELETE USING (bucket_id = 'evolution-photos' AND auth.uid()::text = (storage.foldername(name))[1]);