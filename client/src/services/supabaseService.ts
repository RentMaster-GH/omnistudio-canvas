import { supabase } from './supabaseClient';

export class SupabaseService {
  /**
   * Uploads a file (video, audio, image, pdf) to the 'omnistudio-assets' Supabase Storage Bucket.
   */
  static async uploadMediaAsset(file: File, userId: string, projectId?: string) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // 1. Upload to Supabase Bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('omnistudio-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: urlData } = supabase.storage
      .from('omnistudio-assets')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 3. Detect media type
    let mediaType = 'document';
    if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('image/')) mediaType = 'image';

    // 4. Save metadata record to 'assets' table
    const { data: assetRecord, error: dbError } = await supabase
      .from('assets')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        media_type: mediaType,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return assetRecord;
  }

  /**
   * Saves or updates the full OmniStudio project JSON state in Supabase.
   */
  static async saveProject(userId: string, title: string, jsonState: any, projectId?: string) {
    if (projectId) {
      // Update existing project
      const { data, error } = await supabase
        .from('projects')
        .update({
          title,
          json_state: jsonState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new project
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title,
          json_state: jsonState,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  /**
   * Loads all saved projects for the authenticated user.
   */
  static async getUserProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}