export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const segments = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return segments
    .map((segment, index) => (index === 0 ? String(segment) : String(segment).padStart(2, "0")))
    .join(":");
}

export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
