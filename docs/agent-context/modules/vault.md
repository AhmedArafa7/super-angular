# Vault & Storage Module Architecture

## Overview
The Vault module provides encrypted sovereign file storage, asset management, and offline download synchronization.

## Key Services & Components
- **`VaultService` (`vault.service.ts`):** Manages secure local asset organization, encryption keys, and import/export operations.
- **`VideoDownloadService` (`video-download.service.ts`):** Handles background video downloading and Blob URL caching for offline playback.
- **`IndexedDBService` (`indexed-db.service.ts`):** Robust wrapper around IndexedDB for storing large binary assets and cached API responses with TTL.
