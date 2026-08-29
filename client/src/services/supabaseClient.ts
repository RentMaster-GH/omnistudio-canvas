import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://goifcfwmwxpryrcuvcns.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaWZjZndtd3hwcnlyY3V2Y25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjE1MjQsImV4cCI6MjEwMzU5NzUyNH0.nC-44JYuqGiT4KbfaCDuoNxIOX39uSS4Xa9-7k2-_4I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);