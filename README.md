# Insider Trade Tracker 📊

Welcome to **Insider Trade Tracker** — a lightweight web application to track insider trading activities with real-time updates, detailed analytics, and visually appealing charts!

---

## Disclaimer 📢

**This application is part of a personal project and is not intended to provide professional financial advice.** The recommendations and analytics are based on publicly available financial data and standard ratios, but they should not be used as a sole basis for investment decisions. Always consult a financial advisor for professional guidance.

---

## 🌟 Features

- **Real-time Insider Trading Data**: Tracks the latest insider transactions with a clean, user-friendly table interface.
- **Detailed Financial Insights**: Analyze key financial metrics like revenue, net income, and equity.
- **Dynamic Charts**: View important financial trends with beautiful bar charts powered by Chart.js.
- **Smart Recommendations**: Get BUY, SELL, or HOLD recommendations based on industry standards and financial ratios.
- **Responsive Design**: Works seamlessly across devices with a modern and intuitive UI.
- **Auto-Refresh**: Automatically refreshes data every minute to keep you in the loop.

---

## 🚀 How It Works

1. **Fetches Insider Trades**: Pulls real-time data for insider trading activities.
2. **Drills into Financial Data**: Fetches detailed financial metrics from Polygon.io.
3. **Analyzes and Recommends**: Uses professional-grade calculations for financial ratios like:
   - Net Profit Margin
   - Return on Assets (ROA)
   - Return on Equity (ROE)
   - Debt-to-Equity Ratio
   - Current Ratio
   - Asset Turnover Ratio
4. **Visualizes with Charts**: Displays an intuitive bar chart summarizing key metrics.

---

## 💻 Tech Stack

- **Frontend**: JavaScript, HTML, CSS, Chart.js
- **Backend**: Node.js, Express
- **Data API**: A mix of Polygon, Tiingo, and Finnhub for financial data
- **Design**: Fully responsive and user-friendly

---

## 🔧 Installation and Setup

1. Clone this repository:
   git clone https://github.com/blui/insider-trade-tracker.git

2. Navigate to the project directory:
   cd insider-trade-tracker

3. Install dependencies:
   npm install

4. Add your API key(s):

   - Create a `.env` file in the root directory.
   - Add your API key(s)

5. Start the server:
   npm start

6. Open the app in your browser:
   http://localhost:3000

---

## 🎯 Future Enhancements

- **User Authentication**: Allow users to save preferences and track their favorite stocks.
- **Custom Notifications**: Set up email or SMS alerts for significant insider trades.
- **Advanced Charting**: Add more visualization options like line charts and historical comparisons.
- **Mobile App**: Expand this project to a mobile app for on-the-go analysis.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
