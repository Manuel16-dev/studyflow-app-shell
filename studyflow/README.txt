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
