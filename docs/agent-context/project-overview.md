# Si-Neuro AI Platform - Master Architecture Overview

## Executive Summary
Si-Neuro AI is a high-performance enterprise-grade web platform built with **Angular (Standalone Components, Signals)**. It acts as a unified operating system / central hub integrating media streaming (WeTube), Islamic utilities (Hisn Al-Muslim), interactive arcade gaming, encrypted file storage (Vault), AI assistance, and secure peer-to-peer communication.

## Core Architectural Principles
1. **Standalone Components & Signals:** The application uses modern Angular v19+ features without `NgModule`. State management is driven by reactive Angular Signals (`signal`, `computed`, `effect`) and robust services (`providedIn: 'root'`).
2. **Offline-First & Local Storage:** Critical modules (Hisn, Quran, Vault, Settings) persist data strictly in `localStorage` or `IndexedDB` to minimize cloud costs and guarantee lightning-fast offline access.
3. **Enterprise Security:** Strict CORS boundaries, secure postMessage session synchronization with iframe hosts, and zero credential leakage.
4. **Modular Extensibility:** Designed for dynamic plugin injection and AI-driven module generation.

---

## Global Directory Structure
- `src/app/core/`: Global services, interceptors, guards, storage abstractions, and state management.
- `src/app/layout/`: App Shell layout, sidebar, header, sync monitors.
- `src/app/features/`: Feature modules (WeTube, Hisn, Arcade, Vault, Chat, Peer Chat, OpenCode, Docs, Bakery, Admin).
- `src/app/shared/`: Reusable widgets, onboarding, privacy components.
- `docs/agent-context/`: Architecture documentation files for AI agents.
