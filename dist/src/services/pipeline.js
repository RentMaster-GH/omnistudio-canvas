"use strict";
// src/services/pipeline.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineManager = void 0;
class PipelineManager {
    /**
     * Processes an incoming file drop or upload.
     */
    static async ingestFile(file, project) {
        const fileType = this.detectMediaType(file);
        const fileId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        // 1. Create or select track
        let track = project.tracks.find(t => t.type === fileType);
        if (!track) {
            track = {
                id: crypto.randomUUID(),
                name: `${fileType.toUpperCase()} Track`,
                type: fileType,
                isMuted: false,
                isLocked: false,
                isSolo: false,
                order: project.tracks.length,
            };
            project.tracks.push(track);
        }
        // 2. Initial Clip Definition
        const newClip = {
            id: crypto.randomUUID(),
            trackId: track.id,
            name: file.name,
            type: fileType,
            timelineStart: 0,
            duration: 10, // Default fallback, updated by omni_engine
            mediaOffset: 0,
            sourceUrl: blobUrl,
            fileId,
            transform: {
                position: { x: project.settings.width / 2, y: project.settings.height / 2 },
                size: { width: 400, height: 300 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                opacity: 1,
                zIndex: Object.keys(project.clips).length + 1,
            },
            payload: {
                volume: 1,
                speed: 1,
            },
        };
        project.clips[newClip.id] = newClip;
        return { updatedProject: project, newClip };
    }
    static detectMediaType(file) {
        if (file.type.startsWith('video/'))
            return 'video';
        if (file.type.startsWith('audio/'))
            return 'audio';
        if (file.type.startsWith('image/'))
            return 'image';
        return 'text_doc';
    }
}
exports.PipelineManager = PipelineManager;
