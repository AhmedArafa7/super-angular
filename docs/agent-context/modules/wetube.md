# WeTube Module Architecture

## Overview
WeTube is a fully featured, decentralized video streaming and discovery module inspired by YouTube. It supports robust playback via Piped API / YouTube IFrame fallbacks, ambient lighting extraction, offline video caching, shorts navigation, channel subscriptions, and upload moderation.

## Key Services & Components
- **`WeTubeService` (`wetube.service.ts`):** Manages video feeds, trending algorithms, watch history, subscriptions, and offline sync.
- **`VideoStateService` (`video-state.service.ts`):** Coordinates player UI modes (`hidden`, `floating`, `full`, `pip`), native HLS/MP4 streams, and IFrame fallbacks.
- **`PipedApiService` (`piped-api.service.ts`):** Multi-instance fallback manager connecting to decentralized Piped instances with direct-fetch and proxy fallbacks.
- **`YoutubeDiscoveryService` (`youtube-discovery.service.ts`):** Handles YouTube search, trending scrapers, and oEmbed metadata extraction.
- **`GlobalVideoPlayerComponent` (`global-video-player.component.ts`):** Persistent viewport player with ambient GPU downsampling (1x1 canvas with `requestAnimationFrame`).
