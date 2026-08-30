import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = (SUPABASE_URL.includes('xyzcompany'))
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  /**
   * Saves project state to Supabase Cloud Database (or localStorage fallback).
   */
  static async saveProject(projectId, title, userId, canvasJson, transcriptSegments = []) {
    const payload = {
      id: projectId || crypto.randomUUID(),
      title: title || 'Untitled OmniStudio Project',
      user_id: userId,
      canvas_state: canvasJson,
      transcript_data: transcriptSegments,
      updated_at: new Date().toISOString(),
    };

    // --- FALLBACK LOCALSTORAGE ---
    if (!supabase) {
      console.warn('[SupabaseService] Keys not configured. Saving project to localStorage.');
      localStorage.setItem(`omnistudio_project_${payload.id}`, JSON.stringify(payload));
      return { success: true, project: payload, storage: 'local' };
    }

    // --- SUPABASE CLOUD SYNC ---
    try {
      const { data, error } = await supabase
        .from('projects')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return { success: true, project: data, storage: 'cloud' };
    } catch (err) {
      console.error('[Supabase Error] Save failed:', err);
      // Fallback on failure
      localStorage.setItem(`omnistudio_project_${payload.id}`, JSON.stringify(payload));
      return { success: true, project: payload, storage: 'local_fallback' };
    }
  }

  /**
   * Loads a project from Supabase Cloud or localStorage.
   */
  static async loadProject(projectId) {
    if (!supabase) {
      const localData = localStorage.getItem(`omnistudio_project_${projectId}`);
      return localData ? JSON.parse(localData) : null;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase Error] Load failed, checking localStorage:', err);
      const localData = localStorage.getItem(`omnistudio_project_${projectId}`);
      return localData ? JSON.parse(localData) : null;
    }
  }

  /**
   * Uploads raw media files (PDFs, MP4s, Audio) to Supabase Storage Buckets.
   */
  static async uploadMediaAsset(file, bucketName = 'omnistudio-assets') {
    if (!supabase) {
      console.warn('[SupabaseService] Storage bucket unavailable. Returning local Blob URL.');
      return { url: URL.createObjectURL(file) };
    }

    try {
      const filePath = `${crypto.randomUUID()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return { url: publicUrlData.publicUrl, path: filePath };
    } catch (err) {
      console.error('[Supabase Storage Error]:', err);
      return { url: URL.createObjectURL(file) };
    }
  }
}