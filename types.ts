export interface VideoAsset {
  uri: string;
  mimeType: string;
}

export interface GeneratedVideo {
  video: VideoAsset;
}

export interface VeoResponse {
  generatedVideos?: GeneratedVideo[];
}

export interface VeoOperationResponse {
  name: string;
  metadata: Record<string, any>;
  done: boolean;
  response?: VeoResponse;
  error?: {
    code: number;
    message: string;
  };
}

export interface VideoHistoryItem {
  id: string;
  url: string; // The blob URL for display
  prompt: string;
  timestamp: number;
  veoAsset: VideoAsset; // The asset required for extension
  isExtension: boolean;
}

export type AspectRatio = '16:9' | '9:16';

export enum GenerationStatus {
  IDLE = 'idle',
  WAITING_FOR_KEY = 'waiting_for_key',
  GENERATING = 'generating',
  EXTENDING = 'extending',
  DOWNLOADING = 'downloading',
  ERROR = 'error',
}
