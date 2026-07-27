# Hisn Al-Muslim Module Architecture

## Overview
Hisn Al-Muslim provides Islamic prayers, Azkar, Quran reading, Tasbih counter, prayer times, and Tafsir integration without relying on costly backend Firestore calls.

## Key Services & Components
- **`HisnService` (`hisn.service.ts`):** Manages local state for Azkar categories, Wird tracking, and Tasbih counters stored entirely in `localStorage`.
- **`PrayerQuranService` (`prayer-quran.service.ts`):** Fetches Quran text from Alquran.cloud and caches it locally in IndexedDB for complete offline availability. Supports Uthmani/Tajweed text modes and multiple reciters.
- **`HisnComponent` (`hisn.component.ts`):** Orchestrator component featuring 7 reactive tabs for comprehensive spiritual utilities.
