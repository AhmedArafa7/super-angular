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

export interface NoteImage {
  id: string;
  dataUrl: string;
  order: number;
  createdAt: number;
}

export interface NoteAudio {
  id: string;
  dataUrl: string; // base64 audio (recorded or clipped from video)
  source: 'recorded' | 'video_clip';
  durationSeconds: number;
  createdAt: number;
}

export interface VideoNote {
  id: string;
  videoId: string | null; // null = يتيمة (الفيديو اتحذف)
  videoName: string; // نحتفظ بالاسم حتى لو الفيديو اتحذف عشان يظهر في القائمة
  folderName: string;
  timestampInVideo: number | null; // اللحظة الزمنية المرتبطة، لو موجودة
  text: string;
  textColor: string | null; // hex color، null = افتراضي
  images: NoteImage[];
  audio: NoteAudio | null;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null; // null = مش محذوفة، غير null = في سلة المهملات
}

