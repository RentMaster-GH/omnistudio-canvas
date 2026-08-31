// Stub Supabase client for offline/local canvas operations
export const supabase = {
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: [], error: null }),
    update: async () => ({ data: [], error: null }),
    delete: async () => ({ data: [], error: null }),
  }),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
  },
};

export const createClient = () => supabase;