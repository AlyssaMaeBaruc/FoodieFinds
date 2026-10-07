// TikTok links: reads a video's caption and thumbnail with TikTok's official oEmbed endpoint
// (free, no key), and keeps a copy of the thumbnail because TikTok's image links expire.

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

// photos we keep a copy of; served by the app at /api/images/<file>
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UPLOADS_URL = '/api/images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

class TikTokError extends Error {}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isTikTokUrl = (url) => /(^|\.)tiktok\.com$/.test(hostOf(url));
// TikTok's image servers (the thumbnail links that expire)
const isTikTokImage = (url) => /(^|\.)(tiktokcdn(-[a-z]+)?\.com|tiktokcdn\.com|ibytedtos\.com)$/.test(hostOf(url));

// ".../video/7686993405716647188?q=..." -> "7686993405716647188"
const videoIdFrom = (url) => String(url ?? '').match(/\/video\/(\d{8,25})/)?.[1] ?? null;

// short share links (vm.tiktok.com/AbC/) lead to the full video link
async function fullVideoUrl(url) {
  if (videoIdFrom(url)) return url;
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    return videoIdFrom(res.url) ? res.url : url;
  } catch {
    return url;
  }
}

// -> { videoId, sourceUrl (clean, without tracking), caption, author, thumbnail }
async function fetchTikTok(url) {
  const videoUrl = await fullVideoUrl(url);
  let res;
  try {
    res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new TikTokError("Couldn't reach TikTok. Please try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new TikTokError("Couldn't read that TikTok link. Check it's a public video.");

  const videoId = data.embed_product_id || videoIdFrom(videoUrl);
  const author = data.author_unique_id || null;
  return {
    videoId,
    sourceUrl: author && videoId ? `https://www.tiktok.com/@${author}/video/${videoId}` : videoUrl.split('?')[0],
    caption: data.title || '',
    author: data.author_name || author,
    thumbnail: data.thumbnail_url || null,
  };
}

// downloads a TikTok thumbnail into uploads/ and returns its app link ("/api/images/tiktok-…jpg")
async function keepImageCopy(imageUrl) {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) throw new TikTokError("Couldn't download the TikTok photo.");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new TikTokError('The TikTok photo is too large.');
  const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `tiktok-${crypto.randomUUID()}.${extension}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, fileName), bytes);
  return `${UPLOADS_URL}/${fileName}`;
}

module.exports = { isTikTokUrl, isTikTokImage, videoIdFrom, fetchTikTok, keepImageCopy, TikTokError, UPLOADS_DIR, UPLOADS_URL };
