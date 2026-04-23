import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://rhifvtrzetamrfhflfzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWZ2dHJ6ZXRhbXJmaGZsZnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDIzOTEsImV4cCI6MjA5MTkxODM5MX0.BDmWZeePQyIqTPquqwNbRmAMYvLu5-DEPL7feIamA-k'
);
