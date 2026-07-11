export interface SuperDocument {
  id: string;
  title: string;
  content: string; // HTML rich content format
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  characterCount: number;
  isSynced: boolean;
  userId?: string; // Optional user association for cloud syncing
}
