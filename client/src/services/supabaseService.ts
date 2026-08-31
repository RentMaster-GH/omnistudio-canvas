// Local / Offline Supabase Service Stub
export async function uploadAsset(userId: string, file: File) {
  return {
    id: 'asset_' + Date.now(),
    url: URL.createObjectURL(file),
    fileName: file.name,
  };
}

export async function saveProject(projectId: string | null, userId: string, title: string, jsonState: any) {
  return {
    id: projectId || 'proj_' + Date.now(),
    title,
    json_state: jsonState,
    updated_at: new Date().toISOString(),
  };
}

export async function getUserProjects(userId: string) {
  return [];
}