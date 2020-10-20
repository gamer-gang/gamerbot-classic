// export const urlRegExp = /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
// export const asciiRegExp = /^[ -~]+$/;
// export const youtubePlaylistRegExp = /^https?:\/\/((www\.|music\.|)youtube.com)\/playlist(.+)$/;
// export const youtubeVideoRegExp = /^https?:\/\/(((www\.|music\.|)youtube\.com)\/watch\?v=(.+)|youtu\.be\/.+)$/;
// export const spotifyPlaylistRegExp = /^(https?:\/\/open.spotify.com\/user\/spotify\/playlist\/|spotify:user:spotify:playlist:)([a-zA-Z0-9]+)(.*)$/;
// export const spotifyTrackRegExp = /^(https?:\/\/open.spotify.com\/user\/spotify\/track\/|spotify:user:spotify:playlist:)([a-zA-Z0-9]+)(.*)$/;

export const regExps = {
  url: /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  ascii: /^[ -~]+$/,
  youtube: {
    playlist: /^https?:\/\/((www\.|music\.|)youtube.com)\/playlist(.+)$/,
    video: /^https?:\/\/(((www\.|music\.|)youtube\.com)\/watch\?v=(.+)|youtu\.be\/.+)$/,
  },
  spotify: {
    // https://open.spotify.com/<track|playlist|album>/<id>
    playlist: /^(?:https?:\/\/open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+).*$/,
    album: /^(?:https?:\/\/open\.spotify\.com\/album\/|spotify:album:)([a-zA-Z0-9]+).*$/,
    track: /^(?:https?:\/\/open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+).*$/,
  },
};
