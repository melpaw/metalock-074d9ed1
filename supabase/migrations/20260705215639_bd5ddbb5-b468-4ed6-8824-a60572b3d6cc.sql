ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_locale_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_locale_check CHECK (locale IN ('pt','en','de'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_currency_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_currency_check CHECK (display_currency IN ('USD','EUR'));