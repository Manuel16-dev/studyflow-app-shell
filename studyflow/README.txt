STUDYFLOW — TODAY'S FILES, ORGANIZED
=====================================

Copy each folder's contents into the matching folder in your `studyflow`
project (same names, same nesting):

  src/               → your project's src/
  public/            → your project's public/ (create it if it doesn't exist)
  root/index.html    → your project's index.html (project root, NOT src/)
  supabase-edge-function-reference/
                     → NOT part of the frontend. This is already deployed to
                       Supabase directly. Keep it out of src/ — it's here
                       purely as a saved copy for your records.

After copying everything in:

1. Add this line to .env.local:
   VITE_VAPID_PUBLIC_KEY=BHuX6_EYnavVYL7q3HImc95XxVvIBNEOLEioseJrtDPbcfDGE115qoQB1SNaj0h8qwRIfO0eYMz73J7IkQaCf5k

2. In the Supabase dashboard → your project → Edge Functions →
   send-review-reminders → Secrets, add:
   VAPID_PUBLIC_KEY  = BHuX6_EYnavVYL7q3HImc95XxVvIBNEOLEioseJrtDPbcfDGE115qoQB1SNaj0h8qwRIfO0eYMz73J7IkQaCf5k
   VAPID_PRIVATE_KEY = FHo_WPrkZNWKqRSEsaULWAoVeAZVDL9dZgpKD9x0CCs
   CRON_SECRET       = 309d557fe15b3e83b1d7f42da9120e6977de2d642d8c605f7804509e28078a1d

3. Restart the dev server (not just a browser refresh) and rebuild.

Backend (tables, functions, the Edge Function itself, the cron schedule)
is already live on your Supabase project — nothing else to run.

=======================================================================
AI CARD GENERATION — ONE-TIME SETUP (generate-cards Edge Function)
=======================================================================

The generate flow needs ONE new Edge Function deployed:

1. In the Supabase dashboard -> Edge Functions -> Create a new function
   named exactly: generate-cards

2. Paste in the contents of:
   supabase-edge-function-reference/generate-cards/index.js

3. In that function's Secrets, add:
   GEMINI_API_KEY          = ...           (required — free tier, no card needed)
   ANTHROPIC_API_KEY       = sk-ant-...     (optional Claude fallback)
   OPENAI_API_KEY          = sk-...         (optional second fallback)
   GENERATION_MODEL_GEMINI = gemini-2.5-flash  (optional, this is the default)

4. Deploy the function (dashboard saves + deploys automatically).

How it works: the browser extracts text from the picked PDF/DOCX/TXT
(PDF.js / mammoth, loaded lazily), sends only the TEXT to the function,
which chunks it, generates schema-validated cards (Gemini primary,
Claude then OpenAI as fallbacks), and returns candidates for the
approve/edit flow. The file itself never leaves the device.
