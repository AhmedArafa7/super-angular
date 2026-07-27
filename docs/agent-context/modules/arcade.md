# Arcade & Games Module Architecture

## Overview
The Arcade module hosts high-performance casual games (Space Shooter, Tank Battle, Spot the Differences, Arabic Wordle, etc.) with local scoreboards and procedural AI level generation.

## Key Services & Components
- **`SpotDifferencesService` / `ArcadeService` (`arcade.service.ts`):** Manages game level pools from Firestore and triggers procedural AI level generation when pools deplete.
- **`ArcadeHubComponent` & `ArcadeArenaComponent`:** Hub launcher and game embedding arena with full-screen audio and responsive canvas controls.
