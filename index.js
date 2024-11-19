// Import required libraries
const express = require("express"); // Web framework for handling HTTP requests
const axios = require("axios"); // HTTP client for making API requests
const cron = require("node-cron"); // Scheduler for running tasks periodically
require("dotenv").config(); // Load environment variables from a .env file

// Initialize the Express app
const app = express();
const PORT = 3000; // Define the port where the server will run

// In-memory storage for insider trading data
// This array will hold the filtered insider trading data
let insiderData = [];

/**
 * Helper function to determine if a symbol is US-based.
 * US-based stock tickers typically consist of uppercase letters without exchange suffixes.
 * @param {string} symbol - Stock ticker symbol
 * @returns {boolean} - True if the symbol matches the US equity format
 */
function isUsEquity(symbol) {
  return /^[A-Z]+$/.test(symbol); // Matches only uppercase letters
}

/**
 * Fetch insider trading data from the Finnhub API.
 * Filters the response to include only US-based equities.
 */
async function fetchInsiderTradingData() {
  try {
    // API call to Finnhub for insider trading transactions
    const response = await axios.get(
      "https://finnhub.io/api/v1/stock/insider-transactions",
      {
        params: {
          limit: 100, // Limit the number of results to 100
          token: process.env.FINNHUB_API_KEY, // API key from environment variables
        },
      }
    );

    // Filter the response to include only US-based stock symbols
    insiderData = response.data.data.filter((trade) =>
      isUsEquity(trade.symbol)
    );

    console.log("Insider trading data updated for US equities only.");
  } catch (error) {
    console.error("Error fetching insider trading data:", error.message);
  }
}

// Schedule the Finnhub data fetching task to run every minute
// This ensures that the insider trading data is updated frequently while staying within API rate limits
cron.schedule("*/1 * * * *", fetchInsiderTradingData);
fetchInsiderTradingData(); // Perform an initial data fetch when the server starts

// Serve static frontend files from the "public" directory
// This allows the client (browser) to load the HTML, CSS, and JavaScript files
app.use(express.static("public"));

/**
 * API Endpoint: Retrieve the latest insider trading data.
 * Responds with the in-memory `insiderData` array to provide filtered insider trading information.
 */
app.get("/api/insider-trades", (req, res) => {
  res.json(insiderData); // Send the insider trading data as a JSON response
});

/**
 * API Endpoint: Fetch stock price data from Tiingo API.
 * @query {string} symbol - Stock ticker symbol
 * Returns the latest stock price data for the given symbol.
 */
app.get("/api/tiingo", async (req, res) => {
  const symbol = req.query.symbol; // Retrieve the stock symbol from query parameters
  const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices`; // Tiingo API endpoint

  try {
    // Make a GET request to Tiingo API
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json", // Request header
        Authorization: `Token ${process.env.TIINGO_API_KEY}`, // Tiingo API key
      },
    });

    if (response.data && response.data.length > 0) {
      console.log(`Stock price data fetched for ${symbol}`);
      res.json(response.data); // Send the stock price data as a JSON response
    } else {
      console.error(`No stock price data available for symbol: ${symbol}`);
      res
        .status(404)
        .send(`No stock price data available for symbol: ${symbol}`);
    }
  } catch (error) {
    console.error(
      `Error fetching Tiingo stock price data for ${symbol}:`,
      error.response?.data || error.message
    );
    res
      .status(error.response?.status || 500)
      .send("Error fetching stock price data");
  }
});

/**
 * API Endpoint: Fetch financial data from Polygon.io API.
 * @query {string} symbol - Stock ticker symbol
 * Returns the financial data for the given symbol.
 */
app.get("/api/polygon-financials", async (req, res) => {
  const symbol = req.query.symbol; // Retrieve the stock symbol from query parameters
  const apiKey = process.env.POLYGON_API_KEY; // Polygon.io API key

  try {
    // Make a GET request to Polygon.io API
    const response = await axios.get(
      `https://api.polygon.io/vX/reference/financials?ticker=${symbol}&limit=1&apiKey=${apiKey}`
    );

    if (response.data.results?.length) {
      res.json(response.data.results[0]); // Send the first result as the JSON response
    } else {
      console.error(`No financial data found for ${symbol}.`);
      res.status(404).send("No financial data available.");
    }
  } catch (error) {
    console.error(
      `Error fetching financial data for ${symbol}:`,
      error.response?.data || error.message
    );
    res.status(500).send("Error fetching financial data.");
  }
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
