export interface VideoBookmark {
  id: string;
  videoId: string;
  videoName: string;
  folderName: string;
  time: number;
  note: string;
  formattedTime: string;
}

export interface RecycleBinItem {
  id: string;
  name: string;
  size: number;
  type: 'video' | 'audio';
  duration?: number;
  lastPosition?: number;
  folderName?: string;
  deletedAt: number;
  watchStatus: 'watched' | 'partial' | 'unwatched';
}

export interface LocalMediaItem {
  id: string;
  name: string;
  relativePath?: string;
  folderName?: string;
  size: number;
  type: 'video' | 'audio';
  mimeType: string;
  blobUrl: string;
  fileBlob?: Blob | File;
  duration?: number;
  lastPosition?: number;
  thumbnail?: string;
  subtitlesUrl?: string;
  subtitlesBlob?: Blob | File;
  subtitlesName?: string;
  createdAt: number;
  lastWatchedAt?: number;
}
