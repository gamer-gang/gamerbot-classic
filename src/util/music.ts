import { Video } from 'simple-youtube-api';
import { Track } from '../types';
import { formatDuration } from './duration';

export const isLivestream = (video: Video): boolean =>
  (video.raw.snippet as Record<string, string>).liveBroadcastContent === 'live';

export const getTrackLength = (track: Track): string =>
  track.type === 'youtube' && track.data.livestream
    ? 'livestream'
    : formatDuration(track.data.duration);

export const getTrackUrl = (track: Track): string =>
  track.type === 'spotify'
    ? 'https://open.spotify.com/track/' + track.data.id
    : track.type === 'youtube'
    ? 'https://youtube.com/watch?v=' + track.data.id
    : track.data.url;
