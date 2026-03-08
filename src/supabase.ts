import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cozpygdrzzdwuupbahei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenB5Z2Ryenpkd3V1cGJhaGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDc5MzMsImV4cCI6MjA4ODM4MzkzM30.Pnquf4aBjhEdqS4Qrg0WDyic2tGTVBOc9i3MA7BXovo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
