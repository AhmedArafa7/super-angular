import { Observable } from 'rxjs';
import { FeedVideo } from '../../../features/wetube/wetube.model';
import { VideoDetails } from '../youtube-discovery.service';

export interface VideoProvider {
  name: string;
  search(query: string, sp?: string): Observable<FeedVideo[]>;
  getVideoDetails(videoId: string): Observable<VideoDetails>;
  fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]>;
}
