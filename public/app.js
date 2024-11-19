// Fetch insider trading data from the server API
async function fetchData() {
  try {
    // Make a GET request to the server-side API endpoint "/api/insider-trades"
    // This endpoint is expected to return insider trading data in JSON format
    const response = await fetch("/api/insider-trades");

    // Parse the JSON response from the server
    const data = await response.json();

    // Call the displayData function to populate the table with the fetched data
    displayData(data);
  } catch (error) {
    // Log the error message to the browser's console for debugging
    console.error("Error fetching insider trading data:", error);

    // Update the DOM to inform the user that data loading failed
    // This sets the content of the table's data element to show an error message
    document.getElementById("data").innerText = "Failed to load data.";
  }
}

/**
 * Determines whether a stock is a recommended buy based on its price,
 * relative discount compared to its high price, and trading volume.
 *
 * @param {Object} stockInfo - Stock information object retrieved from the Tiingo API.
 *   @property {number} price - The latest stock price.
 *   @property {number} high - The highest price of the stock over a defined period.
 *   @property {number} volume - The trading volume of the stock.
 *
 * @returns {boolean} - Returns `true` if the stock meets the criteria for a recommended buy, otherwise `false`.
 */
function isRecommendedBuy(stockInfo) {
  const { price, high, volume } = stockInfo;

  // Check for two conditions:
  // 1. The stock price is $2 or below (indicating a very low price).
  // 2. The stock price is less than 70% of its high price (indicating a significant discount)
  //    AND the stock has a high trading volume (greater than 100,000).
  return price <= 2 || (price < 0.7 * high && volume > 100000);
}

/**
 * Display insider trading data in the table with appropriate highlights.
 *
 * This function dynamically populates a table with insider trading data,
 * applies conditional formatting to highlight rows based on trade type and thresholds,
 * and adds click event listeners to display additional details in a modal.
 *
 * @param {Array} data - Array of insider trading data objects retrieved from the Finnhub API.
 *   Each object contains properties like `symbol`, `name`, `transactionCode`, `change`, `transactionPrice`, and `transactionDate`.
 */
function displayData(data) {
  // Get the table body element where rows will be populated
  const tableBody = document
    .getElementById("data") // Select the table with ID "data"
    .getElementsByTagName("tbody")[0]; // Target the <tbody> element within the table

  // Clear previous table data to prepare for new rows
  tableBody.innerHTML = "";

  // Loop through each trade object in the data array
  data.forEach((trade) => {
    // Create a new table row element
    const row = document.createElement("tr");

    // Extract relevant properties from the trade object
    const company = trade.symbol || "N/A"; // Stock ticker symbol or "N/A" if unavailable
    const insider = trade.name || "N/A"; // Name of the insider
    const transactionType = trade.transactionCode || "N/A"; // Type of transaction (e.g., "P" for purchase)
    const shares = trade.change || 0; // Number of shares changed in the transaction
    const price = trade.transactionPrice
      ? parseFloat(trade.transactionPrice) // Parse the price as a float
      : null; // Set to null if not available
    const transactionDate = trade.transactionDate || "N/A"; // Date of the transaction
    const tradeValue = price && shares ? price * shares : 0; // Calculate trade value if price and shares are available

    // Highlight rows based on transaction type and specific conditions
    if (transactionType === "P") {
      // "P" stands for purchase
      if (price <= 2) {
        // Bold highlight for purchases where the price is $2 or below
        row.classList.add("highlight-green-bold");
      } else {
        // Standard green highlight for purchases
        row.classList.add("highlight-green");
      }
    }

    // Populate the row with trade data using a template literal
    row.innerHTML = `
      <td>${company}</td>
      <td>${insider}</td>
      <td>${transactionType}</td>
      <td>${shares}</td>
      <td>${price ? `$${price.toFixed(2)}` : "N/A"}</td>
      <td>${tradeValue ? `$${tradeValue.toLocaleString()}` : "N/A"}</td>
      <td>${transactionDate}</td>
    `;

    // Add an event listener to the row for displaying detailed information in a modal
    row.addEventListener("click", async () => {
      const stockInfo = await fetchTiingoData(company); // Fetch stock price data from the Tiingo API
      const financialData = await fetchFinancialData(company); // Fetch financial data from the Polygon.io API
      if (stockInfo) {
        const recommendationData = financialData
          ? analyzeFinancialData(financialData) // Analyze financial data to compute metrics and recommendations
          : { recommendation: "HOLD", details: {} }; // Default to "HOLD" if financial data is unavailable

        // Display the detailed data in a modal
        showModal(company, stockInfo, recommendationData, financialData);
      }
    });

    // Append the newly created row to the table body
    tableBody.appendChild(row);
  });
}

/**
 * Fetch stock data from Tiingo API.
 *
 * This function fetches stock price data for a given symbol from the Tiingo API.
 * It parses the response to extract relevant information like the latest close price,
 * high price, low price, and trading volume, which are returned in a structured object.
 * If the symbol is invalid or no data is found, it returns `null`.
 *
 * @param {string} symbol - The stock ticker symbol for which data is to be fetched.
 * @returns {Object|null} - An object containing stock information (`price`, `high`, `low`, `volume`) or `null` if not found.
 */
async function fetchTiingoData(symbol) {
  try {
    // Make an API call to the server-side endpoint for Tiingo data
    const response = await fetch(`/api/tiingo?symbol=${symbol}`);

    // Check if the API response is successful (status 200-299)
    if (!response.ok) {
      console.error(
        `Error fetching Tiingo data for ${symbol}: ${response.statusText}` // Log the error status and message
      );
      return null; // Return null if the response is not OK
    }

    // Parse the response body as JSON
    const data = await response.json();

    // Check if data exists and contains at least one record
    if (data && data.length > 0) {
      const latestData = data[0]; // Extract the most recent stock data

      // Return a structured object with relevant stock information
      return {
        price: latestData.close, // Latest closing price
        high: latestData.high, // High price for the day
        low: latestData.low, // Low price for the day
        volume: latestData.volume, // Trading volume
      };
    } else {
      // Log a message if no data is available for the given symbol
      console.error(`No data available from Tiingo for ${symbol}.`);
      return null; // Return null to indicate no data found
    }
  } catch (error) {
    // Catch and log any errors that occur during the fetch process
    console.error(`Error fetching Tiingo data for ${symbol}:`, error);
    return null; // Return null in case of an error
  }
}

/**
 * Displays a modal with detailed stock and financial analysis.
 *
 * This function populates a modal with financial metrics, recommendation data, and a chart (if financial data is available).
 * It sets the modal's visibility and ensures the information presented is formatted clearly.
 *
 * @param {string} company - The company name or stock ticker symbol.
 * @param {Object} stockInfo - Object containing stock price data (e.g., price, volume, etc.).
 * @param {Object} recommendationData - Object containing a recommendation (BUY/HOLD/SELL) and detailed financial metrics.
 * @param {Object|null} financialData - Financial data for the company retrieved from the Polygon.io API. Null if unavailable.
 */
function showModal(company, stockInfo, recommendationData, financialData) {
  // Select the modal elements from the DOM
  const modal = document.getElementById("modal"); // Modal container
  const modalTitle = document.getElementById("modal-title"); // Modal title element
  const modalContent = document.getElementById("modal-content"); // Modal content container

  // Update the modal title with the company name or ticker symbol
  modalTitle.textContent = `Detailed Analysis for ${company}`;

  // Populate the modal with financial metrics and the recommendation
  modalContent.innerHTML = `
    <p><strong>Recommendation:</strong> ${recommendationData.recommendation}</p>
    <table class="detail-table">
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Net Profit Margin</td><td>${recommendationData.details.netProfitMargin.toFixed(
        2
      )}%</td></tr>
      <tr><td>Return on Assets (ROA)</td><td>${recommendationData.details.returnOnAssets.toFixed(
        2
      )}%</td></tr>
      <tr><td>Return on Equity (ROE)</td><td>${recommendationData.details.returnOnEquity.toFixed(
        2
      )}%</td></tr>
      <tr><td>Current Ratio</td><td>${recommendationData.details.currentRatio.toFixed(
        2
      )}</td></tr>
      <tr><td>Debt-to-Equity Ratio</td><td>${recommendationData.details.debtToEquity.toFixed(
        2
      )}</td></tr>
      <tr><td>Asset Turnover Ratio</td><td>${recommendationData.details.assetTurnover.toFixed(
        2
      )}</td></tr>
    </table>
  `;

  // Make the modal visible by setting its display style
  modal.style.display = "flex";
  console.log("Modal displayed. Creating chart...");

  // If financial data is available, create a chart inside the modal
  if (financialData) {
    createChart(financialData); // Generate a financial chart
  } else {
    console.warn("Financial data not available. Skipping chart creation."); // Log a warning if no data is present
  }
}

/**
 * Closes the modal and performs necessary cleanup operations when the close button is clicked.
 *
 * This function hides the modal from view, ensures that any chart inside the modal is destroyed
 * to free up memory, and logs the closure action for debugging purposes.
 */
document.querySelector(".close-modal").addEventListener("click", () => {
  console.log("Close modal clicked"); // Log the event for debugging purposes

  // Select the modal container from the DOM
  const modal = document.getElementById("modal");

  // Set the modal's display style to 'none' to hide it from view
  modal.style.display = "none";

  // Check if a financial chart instance exists
  if (financialChartInstance) {
    // Destroy the existing chart instance to free up memory and prevent rendering issues
    financialChartInstance.destroy();

    // Reset the global chart instance variable to null
    financialChartInstance = null;
  }
});

/**
 * Closes the modal when the user clicks outside the modal content.
 *
 * This function listens for clicks anywhere on the screen and determines if the click occurred
 * outside the modal content. If so, it hides the modal and cleans up any chart instance to
 * maintain optimal resource usage.
 */
window.addEventListener("click", (event) => {
  // Select the modal element from the DOM
  const modal = document.getElementById("modal");

  // Check if the click event's target matches the modal itself (outside of modal content)
  if (event.target === modal) {
    console.log("Close modal by clicking outside"); // Debugging log for developers

    // Hide the modal by setting its display style to 'none'
    modal.style.display = "none";

    // If a financial chart instance exists, destroy it to release resources
    if (financialChartInstance) {
      financialChartInstance.destroy(); // Cleanup the chart
      financialChartInstance = null; // Reset the chart instance variable
    }
  }
});

let financialChartInstance; // Global variable to track the current chart instance

/**
 * Creates and displays a bar chart using Chart.js to visualize financial metrics.
 *
 * This function dynamically generates a bar chart to represent key financial data
 * such as Revenue, Net Income, Assets, Liabilities, and Equity.
 *
 * @param {Object} financialData - Financial data object from Polygon.io API.
 */
function createChart(financialData) {
  // Retrieve the canvas element where the chart will be rendered
  const canvas = document.getElementById("financialChart");

  // Check if the canvas element exists
  if (!canvas) {
    console.warn("Canvas element not found for chart.");
    return;
  }

  // Set explicit dimensions for the canvas to avoid rendering issues
  canvas.width = canvas.offsetWidth || 400; // Default width to 400px if not set
  canvas.height = canvas.offsetHeight || 200; // Default height to 200px if not set

  // Get the 2D rendering context from the canvas
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Canvas context could not be initialized.");
    return;
  }

  // Destroy the existing chart instance if it exists to avoid duplicates
  if (financialChartInstance) {
    financialChartInstance.destroy(); // Cleanup existing chart
    financialChartInstance = null; // Reset the global variable
  }

  // Extract financial metrics and labels for the chart
  const labels = ["Revenue", "Net Income", "Assets", "Liabilities", "Equity"];
  const data = [
    financialData.financials.income_statement?.revenues?.value || 0, // Revenue
    financialData.financials.income_statement?.net_income_loss?.value || 0, // Net Income
    financialData.financials.balance_sheet?.assets?.value || 0, // Total Assets
    financialData.financials.balance_sheet?.liabilities?.value || 0, // Total Liabilities
    financialData.financials.balance_sheet?.equity?.value || 0, // Equity
  ];

  console.log("Chart data:", data); // Debugging: log the extracted data

  // Attempt to create a new bar chart
  try {
    financialChartInstance = new Chart(ctx, {
      type: "bar", // Bar chart type
      data: {
        labels, // Labels for the x-axis
        datasets: [
          {
            label: "Financial Metrics (USD)", // Dataset label
            data, // Data values for the chart
            backgroundColor: [
              "rgba(75, 192, 192, 0.2)", // Revenue bar color
              "rgba(75, 75, 192, 0.2)", // Net Income bar color
              "rgba(192, 192, 75, 0.2)", // Assets bar color
              "rgba(192, 75, 75, 0.2)", // Liabilities bar color
              "rgba(75, 192, 75, 0.2)", // Equity bar color
            ],
            borderColor: [
              "rgba(75, 192, 192, 1)", // Revenue border color
              "rgba(75, 75, 192, 1)", // Net Income border color
              "rgba(192, 192, 75, 1)", // Assets border color
              "rgba(192, 75, 75, 1)", // Liabilities border color
              "rgba(75, 192, 75, 1)", // Equity border color
            ],
            borderWidth: 1, // Border width of the bars
          },
        ],
      },
      options: {
        responsive: true, // Make the chart responsive to screen size
        plugins: {
          tooltip: {
            // Customize tooltip content
            callbacks: {
              label: function (context) {
                // Format numbers as currency with commas
                return `$${context.raw.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true, // Start the y-axis at zero
            title: {
              display: true, // Display the y-axis title
              text: "Value (USD)", // Title text
            },
          },
        },
      },
    });

    console.log("Chart created successfully"); // Debugging: confirm successful creation
  } catch (err) {
    // Catch and log any errors during chart creation
    console.error("Error creating chart:", err);
  }
}

/**
 * Fetch financial data using the Polygon.io API.
 *
 * This function retrieves detailed financial data for a given stock ticker symbol
 * from the Polygon.io API. It ensures proper error handling and returns either
 * the fetched data or `null` if an error occurs.
 *
 * @param {string} symbol - The stock ticker symbol for which financial data is requested.
 * @returns {Object|null} - A JSON object containing financial data or `null` if unavailable.
 */
async function fetchFinancialData(symbol) {
  try {
    // Construct the API endpoint URL using the provided stock symbol
    const response = await fetch(`/api/polygon-financials?symbol=${symbol}`);

    // Check if the response status is not OK (status code 200)
    if (!response.ok) {
      // Throw an error if the response status indicates a failure
      throw new Error("Failed to fetch financial data.");
    }

    // Parse the JSON response and return the financial data
    return await response.json();
  } catch (error) {
    // Log the error message to the console for debugging purposes
    console.error(`Error fetching financial data for ${symbol}:`, error);

    // Return null to indicate that financial data could not be fetched
    return null;
  }
}

/**
 * Analyze financial data to compute key metrics and recommendations.
 *
 * This function processes detailed financial data for a company to calculate
 * key financial ratios, such as Net Profit Margin, Return on Assets (ROA),
 * Return on Equity (ROE), Current Ratio, Debt-to-Equity Ratio, and Asset Turnover Ratio.
 * Based on these metrics, it provides a recommendation (BUY, SELL, or HOLD).
 *
 * @param {Object} financialData - Financial data from the Polygon.io API.
 * @returns {Object} - An object containing a recommendation and analysis details.
 */
function analyzeFinancialData(financialData) {
  const { financials } = financialData;

  // Check if financial data is available; if not, return a default "HOLD" recommendation.
  if (!financials) {
    console.warn("Incomplete financial data. Analysis may be limited.");
    return { recommendation: "HOLD", details: {} };
  }

  // Extract key financial values with fallback defaults to prevent errors.
  const revenues = financials.income_statement?.revenues?.value || 0; // Revenue from the income statement
  const netIncome = financials.income_statement?.net_income_loss?.value || 0; // Net income or loss
  const totalAssets = financials.balance_sheet?.assets?.value || 0; // Total assets from the balance sheet
  const currentAssets = financials.balance_sheet?.current_assets?.value || 0; // Current assets
  const currentLiabilities =
    financials.balance_sheet?.current_liabilities?.value || 1; // Current liabilities (avoid division by zero)
  const totalLiabilities = financials.balance_sheet?.liabilities?.value || 0; // Total liabilities
  const equity = financials.balance_sheet?.equity?.value || 1; // Equity (avoid division by zero)

  // Compute financial ratios to assess company performance.
  const netProfitMargin = (netIncome / revenues) * 100 || 0; // Percentage of profit relative to revenue
  const returnOnAssets = (netIncome / totalAssets) * 100 || 0; // Efficiency of asset utilization for profit generation
  const returnOnEquity = (netIncome / equity) * 100 || 0; // Profitability relative to shareholder equity
  const currentRatio = currentAssets / currentLiabilities || 0; // Liquidity to meet short-term obligations
  const debtToEquity = totalLiabilities / equity || 0; // Leverage ratio indicating financial risk
  const assetTurnover = revenues / totalAssets || 0; // Efficiency of asset usage in generating revenue

  // Log calculated ratios for debugging and transparency.
  console.log("Financial Ratios:", {
    netProfitMargin,
    returnOnAssets,
    returnOnEquity,
    currentRatio,
    debtToEquity,
    assetTurnover,
  });

  // Determine recommendation based on financial ratios.
  let recommendation = "HOLD"; // Default recommendation
  if (
    netProfitMargin > 10 && // Healthy profit margin
    returnOnAssets > 5 && // Good asset efficiency
    returnOnEquity > 10 && // Strong equity returns
    currentRatio > 1.5 && // Sufficient liquidity
    debtToEquity < 2 // Low financial leverage
  ) {
    recommendation = "BUY"; // Strong financial performance
  } else if (
    netProfitMargin < 0 || // Negative profit margin
    returnOnAssets < 1 || // Poor asset efficiency
    currentRatio < 1 // Insufficient liquidity
  ) {
    recommendation = "SELL"; // Weak financial indicators
  }

  // Return the recommendation and calculated financial ratios.
  return {
    recommendation, // Recommendation based on financial performance
    details: {
      netProfitMargin, // Percentage
      returnOnAssets, // Percentage
      returnOnEquity, // Percentage
      currentRatio, // Ratio
      debtToEquity, // Ratio
      assetTurnover, // Ratio
    },
  };
}

// Update table every minute with real-time data
setInterval(fetchData, 60000);
fetchData();
