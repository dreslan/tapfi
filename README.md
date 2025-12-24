# 💰 TapFI - Financial Independence Tracker

TapFI is a privacy-first, browser-based dashboard designed specifically for the FIRE (Financial Independence, Retire Early) community. 

Unlike traditional net worth trackers that require your bank passwords or store your data on remote servers, TapFI runs entirely in your browser. Your financial data never leaves your device.

## 🚀 Key Features

*   **Privacy First:** All data is stored in your browser's `localStorage`. No servers, no accounts, no API connections to your bank.
*   **FIRE-Specific Metrics:** Native calculations for:
    *   **Coast FI:** The point where you can stop contributing and let compound interest do the rest.
    *   **Barista Gap:** The monthly income gap between your safe withdrawal rate and your expenses.
    *   **Financial Runway:** How long you could survive on your current net worth.
    *   **Passive Wage:** Your investment returns expressed as an hourly wage.
*   **Accessible vs. Total Net Worth:** Distinguishes between funds accessible now vs. those locked in retirement accounts (pre-59.5), giving you a realistic picture of your early retirement feasibility.
*   **Interactive Projections:** Visualize your path to FI with adjustable assumptions for returns, inflation, and contributions.
*   **CSV Imports:** Quickly import positions from **Fidelity** and **Schwab** exports.

## 🛠️ How to Use

1.  **Open the App:** Simply open `index.html` in any modern web browser.
2.  **Configure Your Goal:** Set your annual expenses, withdrawal rate (e.g., 4%), and current age.
3.  **Add Accounts:**
    *   **Manual Entry:** Add accounts one by one.
    *   **Import:** Download a CSV "Positions" export from Fidelity or Schwab and drag-and-drop it into the tool.
4.  **Analyze:** Use the dashboard to track your progress, view your asset allocation, and project your freedom date.

## 🔒 Privacy & Security

*   **Offline Capable:** The app works without an internet connection (after initial load of Chart.js).
*   **Data Ownership:** You can export your entire dataset to a JSON file for backup or transfer to another device.
*   **No Tracking:** No analytics, no cookies, no third-party trackers.

## 💻 Tech Stack

*   **Core:** Vanilla JavaScript (ES6+)
*   **Styling:** CSS3 (Variables, Flexbox, Grid)
*   **Visualization:** [Chart.js](https://www.chartjs.org/)
*   **Storage:** LocalStorage API

## ⚠️ Disclaimer

This tool is for educational and entertainment purposes only. It is not financial advice. Investment returns are projections, not guarantees. Always do your own due diligence.
