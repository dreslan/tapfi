# 🗺️ TapFI Roadmap

This document outlines the planned development path for TapFI. Dates are estimates and subject to change.

## Q1 2026: Usability & Robustness

### January 2026
*   **PR #1: Enhanced Landing Page & Onboarding**
    *   *Goal:* Clarify the value proposition immediately upon load.
    *   *Details:* Add concise description to header explaining "Privacy-First" and "Offline" nature. Add a "Demo Mode" button to populate dummy data for new users to explore features.
    *   *Status:* 🚧 In Progress

*   **PR #2: Robust CSV Import Error Handling**
    *   *Goal:* Prevent silent failures when importing slightly changed CSV formats.
    *   *Details:* Implement a "dry-run" parser that identifies columns dynamically rather than relying on hardcoded indices. Add detailed error messages for users when parsing fails (e.g., "Could not find 'Symbol' column").

### February 2026
*   **PR #3: Vanguard & E*TRADE Support**
    *   *Goal:* Expand automated import support to the next two largest brokerages.
    *   *Details:* Add parsing logic for Vanguard's "Holdings" CSV and E*TRADE's "Portfolio" export.

*   **PR #4: Mobile Responsiveness Overhaul**
    *   *Goal:* Make the dashboard usable on smartphones.
    *   *Details:* Refactor tables to card-views on small screens. Adjust Chart.js aspect ratios for vertical layouts. Fix touch targets for "Edit/Delete" buttons.

## Q2 2026: Data Security & Advanced Features

### April 2026
*   **PR #5: Encrypted Cloud Backup (Optional)**
    *   *Goal:* Solve the "lost data" risk of LocalStorage without compromising privacy.
    *   *Details:* Allow users to encrypt their JSON export with a password *client-side* before offering it for download. (Note: We will NOT build a server sync yet, just safer manual backups).

### May 2026
*   **PR #6: Inflation-Adjusted Projections**
    *   *Goal:* More realistic long-term planning.
    *   *Details:* Add an "Inflation Rate" input to the configuration. Adjust future value calculations to show "Today's Dollars" vs "Future Dollars".

### June 2026
*   **PR #7: Progressive Web App (PWA)**
    *   *Goal:* Native-app-like experience.
    *   *Details:* Add `manifest.json` and Service Workers to allow "Install to Home Screen" and full offline functionality.

## Backlog (Future Consideration)
*   **Tax Drag Simulation:** Estimating tax impact on withdrawals.
*   **Multiple Portfolios:** Tracking "Spouse A" vs "Spouse B" vs "Joint".
*   **Dark/Light Mode Toggle:** Currently Dark Mode only.
