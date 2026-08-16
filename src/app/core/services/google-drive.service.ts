import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout } from 'rxjs';

export interface DriveVideoItem {
  id: string;
  name: string;
  title: string;
  mimeType: string;
  size?: number;
  thumbnail: string;
  url: string;
  embedUrl: string;
  folderId: string;
  folderName: string;
  parentFolderName?: string;
  folderPath: string; // e.g. "01 Database / Session 01 [ERD]"
  folderHierarchy: string[]; // e.g. ["01 Database", "Session 01 [ERD]"]
  selected: boolean;
}

export interface DriveFolderNode {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
  path: string;
  hierarchy: string[];
  subfolders: DriveFolderNode[];
  videos: DriveVideoItem[];
  isOpen: boolean;
  selected: boolean;
  totalVideosCount: number;
}

export interface DriveTreeResult {
  rootId: string;
  rootName: string;
  tree: DriveFolderNode;
  allVideos: DriveVideoItem[];
  totalFolders: number;
  totalVideos: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private http = inject(HttpClient);

  // Default API Key from environment or fallback
  private defaultApiKey = (environment as any).googleDriveApiKey || (environment as any).firebase?.apiKey || '';

  /**
   * Extracts Google Drive folder ID from various URL formats or returns raw ID
   */
  extractFolderId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();

    // Standard Drive Folder URLs:
    // https://drive.google.com/drive/folders/10Gy7o_mWsABfrEnSZdgt7k5p_9y47JVY
    // https://drive.google.com/drive/u/0/folders/10Gy7o_mWsABfrEnSZdgt7k5p_9y47JVY?usp=sharing
    const folderMatch = clean.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
    if (folderMatch && folderMatch[1]) return folderMatch[1];

    // Query param style: id=...
    const paramMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (paramMatch && paramMatch[1]) return paramMatch[1];

    // Raw alphanumeric ID (typically 25-45 characters for Google Drive folders)
    if (/^[a-zA-Z0-9_-]{15,50}$/.test(clean) && !clean.includes('http') && !clean.includes('.')) {
      return clean;
    }

    return null;
  }

  /**
   * Checks if a given string is a Google Drive URL
   */
  isGoogleDriveUrl(url: string): boolean {
    if (!url) return false;
    return /(?:drive\.google\.com|docs\.google\.com)/i.test(url) || !!this.extractFolderId(url);
  }

  /**
   * Checks if an item is a video based on mimeType or file extension
   */
  isVideoFile(file: { name?: string; mimeType?: string }): boolean {
    const mime = (file.mimeType || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (mime.startsWith('video/')) return true;
    if (mime.includes('google-apps.video')) return true;

    const videoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v', '.flv', '.wmv', '.3gp', '.ts'];
    return videoExts.some(ext => name.endsWith(ext));
  }

  /**
   * Generates resilient, high-quality permanent thumbnail URL for a Drive video
   */
  getThumbnailUrl(fileId: string, apiThumbnail?: string): string {
    if (apiThumbnail) {
      // Replace size query with high resolution if present
      return apiThumbnail.replace(/=s\d+$/, '=s800');
    }
    // High-res permanent Google Drive Thumbnail Endpoint
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }

  /**
   * Generates Google Drive standard embed preview URL
   */
  getEmbedUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Generates Google Drive standard view link
   */
  getViewUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  /**
   * Recursively crawls Google Drive folder hierarchy using Drive API v3
   * @param rootFolderId Google Drive folder ID
   * @param customApiKey Optional Google Drive API Key
   * @param maxDepth Maximum recursion depth (default 4)
   */
  async crawlFolderHierarchy(
    rootFolderId: string,
    customApiKey?: string,
    maxDepth: number = 4
  ): Promise<DriveTreeResult> {
    const apiKey = (customApiKey || this.defaultApiKey || '').trim();
    if (!apiKey) {
      throw new Error('يرجى توفير مفتاح Google Drive API Key لمتابعة الفهرسة السريعة.');
    }

    const visitedFolderIds = new Set<string>();
    const allVideos: DriveVideoItem[] = [];
    let totalFolders = 0;

    // 1. Fetch root folder metadata
    let rootName = 'مجلد Google Drive';
    try {
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType&key=${apiKey}`;
      const rootMeta = await firstValueFrom(this.http.get<any>(metaUrl).pipe(timeout(6000)));
      if (rootMeta?.name) {
        rootName = rootMeta.name;
      }
    } catch (e) {
      console.warn('[GoogleDriveService] Could not fetch root folder name directly, using default.', e);
    }

    // 2. Recursive Explorer
    const crawlNode = async (
      folderId: string,
      folderName: string,
      parentName?: string,
      parentId?: string,
      currentDepth: number = 0,
      hierarchyPath: string[] = []
    ): Promise<DriveFolderNode> => {
      visitedFolderIds.add(folderId);
      totalFolders++;

      const currentHierarchy = [...hierarchyPath, folderName];
      const pathString = currentHierarchy.join(' / ');

      const node: DriveFolderNode = {
        id: folderId,
        name: folderName,
        parentId,
        parentName,
        path: pathString,
        hierarchy: currentHierarchy,
        subfolders: [],
        videos: [],
        isOpen: currentDepth <= 1, // Auto-expand first level
        selected: true,
        totalVideosCount: 0
      };

      if (currentDepth >= maxDepth) {
        return node;
      }

      // Query children files & folders
      // Using Drive API v3: GET /files?q='FOLDER_ID' in parents and trashed=false
      const fields = 'files(id,name,mimeType,thumbnailLink,hasThumbnail,size,webViewLink,videoMediaMetadata,parents)';
      const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=500&fields=${encodeURIComponent(fields)}&key=${apiKey}`;

      let children: any[] = [];
      try {
        const res = await firstValueFrom(this.http.get<any>(apiUrl).pipe(timeout(8000)));
        children = res?.files || [];
      } catch (err: any) {
        console.error(`[GoogleDriveService] Failed to list folder children for ${folderId}:`, err);
        // Throw helpful error message
        if (err?.status === 403 || err?.error?.error?.code === 403) {
          throw new Error('تعذر الوصول للمجلد (403). تأكد من تفعيل Google Drive API وصلاحية "أي شخص لديه الرابط يمكنه العرض".');
        }
        if (err?.status === 404 || err?.error?.error?.code === 404) {
          throw new Error('المجلد غير موجود أو تم حذفه من Google Drive.');
        }
        throw new Error(`فشل الاتصال بـ Google Drive API: ${err?.message || 'خطأ غير معروف'}`);
      }

      // Process videos & subfolders
      const subfolderPromises: Promise<DriveFolderNode>[] = [];

      for (const item of children) {
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';

        if (isFolder) {
          if (!visitedFolderIds.has(item.id)) {
            subfolderPromises.push(
              crawlNode(
                item.id,
                item.name || 'مجلد فرعي',
                folderName,
                folderId,
                currentDepth + 1,
                currentHierarchy
              )
            );
          }
        } else if (this.isVideoFile(item)) {
          // Clean title: remove common video file extensions for cleaner UI
          const cleanTitle = (item.name || 'فيديو').replace(/\.(mp4|mkv|webm|avi|mov|m4v|flv|wmv|ts)$/i, '');

          const videoItem: DriveVideoItem = {
            id: item.id,
            name: item.name,
            title: cleanTitle,
            mimeType: item.mimeType || 'video/mp4',
            size: item.size ? parseInt(item.size, 10) : undefined,
            thumbnail: this.getThumbnailUrl(item.id, item.thumbnailLink),
            url: item.webViewLink || this.getViewUrl(item.id),
            embedUrl: this.getEmbedUrl(item.id),
            folderId: folderId,
            folderName: folderName,
            parentFolderName: parentName,
            folderPath: pathString,
            folderHierarchy: currentHierarchy,
            selected: true
          };

          node.videos.push(videoItem);
          allVideos.push(videoItem);
        }
      }

      // Await all subfolders
      if (subfolderPromises.length > 0) {
        node.subfolders = await Promise.all(subfolderPromises);
      }

      // Calculate total video count recursively
      node.totalVideosCount = node.videos.length + node.subfolders.reduce((acc, sf) => acc + sf.totalVideosCount, 0);

      return node;
    };

    const tree = await crawlNode(rootFolderId, rootName, undefined, undefined, 0, []);

    return {
      rootId: rootFolderId,
      rootName: rootName,
      tree,
      allVideos,
      totalFolders,
      totalVideos: allVideos.length
    };
  }
}
