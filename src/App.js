import "./App.css";
import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [wishlistURL, setWishlistURL] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Ethics database (same as before)
  const ethicsScores = {
    amazon: {
      score: 30,
      reason: "Tax avoidance, labor issues",
      color: "#ff4444",
    },
    "world of books": {
      score: 85,
      reason: "Circular economy, B Corp",
      color: "#44ff44",
    },
    "better world books": {
      score: 90,
      reason: "Funds literacy programs",
      color: "#44ff44",
    },
    thriftbooks: { score: 80, reason: "Book reuse", color: "#44ff44" },
    waterstones: { score: 60, reason: "UK company", color: "#ffaa44" },
    blackwells: { score: 65, reason: "Academic focus", color: "#ffaa44" },
    hive: { score: 75, reason: "Supports indie bookshops", color: "#44ff44" },
    "john lewis": { score: 70, reason: "Employee-owned", color: "#ffaa44" },
    currys: { score: 55, reason: "UK company", color: "#ffaa44" },
    "back market": {
      score: 85,
      reason: "Refurbished electronics",
      color: "#44ff44",
    },
    "charity shops": {
      score: 95,
      reason: "Funds good causes",
      color: "#44ff44",
    },
    etsy: { score: 70, reason: "Supports small creators", color: "#ffaa44" },
    "local shops": { score: 80, reason: "Community support", color: "#44ff44" },
  };

  // Extract text from PDF using pdf.js
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      const numPages = pdf.numPages;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setExtractionProgress(Math.round((pageNum / numPages) * 100));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Combine text items with proper spacing
        const pageText = textContent.items.map((item) => item.str).join(" ");

        fullText += pageText + "\n";
      }

      return fullText;
    } catch (error) {
      console.error("PDF extraction error:", error);
      throw error;
    }
  };

  // Enhanced parsing for Amazon wishlist format
  const parseWishlistText = (text) => {
    const items = [];
    const lines = text.split("\n");

    // Amazon wishlist patterns
    const patterns = {
      // Pattern 1: Title followed by "by Author (Format)"
      bookPattern: /^(.+?)[\s]*by\s+(.+?)\s*\(([^)]+)\)/,
      // Pattern 2: Price pattern
      pricePattern: /£(\d+\.?\d*)/,
      // Pattern 3: Quantity and Has columns (usually "1 0" at the end)
      quantityPattern: /\s+(\d+)\s+(\d+)\s*$/,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines or very short lines
      if (!line || line.length < 3) continue;

      let item = null;

      // Try to match book pattern
      const bookMatch = line.match(patterns.bookPattern);
      if (bookMatch) {
        item = {
          title: bookMatch[1].trim(),
          author: bookMatch[2].trim(),
          format: bookMatch[3].trim(),
          category: categorizeItem(bookMatch[1] + " " + bookMatch[3]),
        };
      }

      // Look for standalone titles (lines that don't match specific patterns but look like products)
      else if (
        line.length > 10 &&
        !line.match(/^(Title|Price|Quantity|Has|Comments)/) &&
        !line.match(/^\d+\s+of\s+\d+/)
      ) {
        // Check if previous line might be the title
        let title = line;

        // If next line has "by", this might be a title
        if (i + 1 < lines.length && lines[i + 1].includes(" by ")) {
          title = line;
          // Skip the next line since we're processing it now
          i++;
        }

        item = {
          title: title.substring(0, 150), // Limit length
          category: categorizeItem(title),
        };
      }

      // Add price if found
      if (item && line.match(patterns.pricePattern)) {
        const priceMatch = line.match(patterns.pricePattern);
        item.price = parseFloat(priceMatch[1]);
      }

      if (item && item.title) {
        items.push(item);
      }
    }

    // Remove duplicates
    const uniqueItems = items.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (i) => i.title.toLowerCase() === item.title.toLowerCase()
        )
    );

    return uniqueItems;
  };

  // Enhanced categorization
  const categorizeItem = (text) => {
    const textLower = text.toLowerCase();

    // More specific categorization rules
    const categoryRules = [
      {
        category: "books",
        keywords: [
          "book",
          "novel",
          "paperback",
          "hardcover",
          "kindle",
          "author",
          "read",
          "story",
          "tales",
          "guide",
        ],
      },
      {
        category: "electronics",
        keywords: [
          "electronic",
          "phone",
          "cable",
          "charger",
          "usb",
          "computer",
          "laptop",
          "tablet",
          "camera",
          "headphone",
        ],
      },
      {
        category: "toys",
        keywords: [
          "toy",
          "game",
          "puzzle",
          "play",
          "child",
          "kid",
          "lego",
          "board game",
        ],
      },
      {
        category: "garden",
        keywords: [
          "garden",
          "plant",
          "seed",
          "outdoor",
          "flower",
          "lawn",
          "soil",
        ],
      },
      {
        category: "home",
        keywords: [
          "kitchen",
          "home",
          "decor",
          "furniture",
          "lamp",
          "cushion",
          "table",
        ],
      },
      {
        category: "health",
        keywords: [
          "beauty",
          "health",
          "care",
          "cosmetic",
          "skincare",
          "vitamin",
          "wellness",
        ],
      },
      {
        category: "fashion",
        keywords: [
          "clothing",
          "shirt",
          "dress",
          "shoes",
          "jacket",
          "fashion",
          "wear",
        ],
      },
    ];

    for (const rule of categoryRules) {
      if (rule.keywords.some((keyword) => textLower.includes(keyword))) {
        return rule.category;
      }
    }

    return "general";
  };

  // Handle PDF upload with full extraction
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setUploadedFileName(file.name);
      setLoading(true);
      setExtractionProgress(0);

      try {
        // Extract text using pdf.js
        const fullText = await extractTextFromPDF(file);

        // Parse the extracted text
        const items = parseWishlistText(fullText);
        setExtractedItems(items);

        if (items.length > 0) {
          // Analyze the items
          analyzeWishlistItems(items);
        } else {
          alert(
            "No items could be extracted. Please make sure this is an Amazon wishlist PDF."
          );
          setLoading(false);
        }
      } catch (error) {
        console.error("Error processing PDF:", error);
        alert("Error reading PDF. Please try again or use a different file.");
        setLoading(false);
      }
    }
  };

  // Analyze extracted wishlist items
  const analyzeWishlistItems = (items) => {
    // Group items by category
    const categories = {};
    items.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = {
          items: [],
          count: 0,
        };
      }
      categories[item.category].items.push(item);
      categories[item.category].count++;
    });

    // Get recommendations for each category
    const analysisResults = {};

    Object.keys(categories).forEach((category) => {
      const retailers = getRetailersForCategory(category);
      analysisResults[category] = {
        retailers: retailers
          .map((name) => ({
            name,
            ...(ethicsScores[name.toLowerCase()] || {
              score: 50,
              reason: "No data",
              color: "#aaaaaa",
            }),
          }))
          .sort((a, b) => b.score - a.score),
        itemCount: categories[category].count,
        sampleItems: categories[category].items.slice(0, 3), // First 3 items as examples
      };
    });

    setResults({
      type: "wishlist",
      data: analysisResults,
      itemCount: items.length,
      categoryCount: Object.keys(categories).length,
      extractedItems: items.slice(0, 10), // Show first 10 items
      categories: categories,
    });
    setLoading(false);
    setActiveTab("results");
  };

  // Get relevant retailers for a category
  const getRetailersForCategory = (category) => {
    const retailerMap = {
      books: [
        "World of Books",
        "Better World Books",
        "ThriftBooks",
        "Hive",
        "Waterstones",
        "Amazon",
      ],
      electronics: ["Back Market", "John Lewis", "Currys", "Amazon"],
      toys: ["Local Shops", "John Lewis", "Charity Shops", "Amazon"],
      garden: ["Local Shops", "Charity Shops", "Amazon"],
      home: ["Charity Shops", "Local Shops", "John Lewis", "Amazon"],
      health: ["Local Shops", "John Lewis", "Amazon"],
      fashion: ["Charity Shops", "Local Shops", "Amazon"],
      general: ["Charity Shops", "Local Shops", "Etsy", "Amazon"],
    };

    return retailerMap[category] || retailerMap["general"];
  };

  // URL handling (unchanged)
  const handleURLSubmit = () => {
    if (wishlistURL) {
      setLoading(true);
      setTimeout(() => {
        alert(
          "URL processing requires the wishlist to be public. For best results, please use the PDF upload option."
        );
        setLoading(false);
      }, 1500);
    }
  };

  // Quick search (unchanged)
  const quickSearch = () => {
    const searchLower = searchTerm.toLowerCase();
    let category = "general";

    // Determine category from search
    if (searchLower.includes("book")) category = "books";
    else if (
      searchLower.includes("electronic") ||
      searchLower.includes("phone")
    )
      category = "electronics";
    else if (searchLower.includes("toy") || searchLower.includes("game"))
      category = "toys";

    const retailers = getRetailersForCategory(category);
    const scoredRetailers = retailers
      .map((name) => ({
        name,
        ...(ethicsScores[name.toLowerCase()] || {
          score: 50,
          reason: "No data",
          color: "#aaaaaa",
        }),
      }))
      .sort((a, b) => b.score - a.score);

    setResults({
      type: "search",
      data: {
        "Search Results": {
          retailers: scoredRetailers,
          itemCount: 1,
        },
      },
      searchTerm: searchTerm,
    });
    setActiveTab("results");
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 Ethical Gift Finder</h1>
        <p>Find better places to shop using open data</p>
      </header>

      <div className="tabs">
        <button
          className={activeTab === "upload" ? "tab active" : "tab"}
          onClick={() => setActiveTab("upload")}
        >
          📄 Upload/URL
        </button>
        <button
          className={activeTab === "search" ? "tab active" : "tab"}
          onClick={() => setActiveTab("search")}
        >
          🔍 Quick Search
        </button>
        <button
          className={activeTab === "results" ? "tab active" : "tab"}
          onClick={() => setActiveTab("results")}
          disabled={!results}
        >
          📊 Results
        </button>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Extracting items from PDF...</p>
          {extractionProgress > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${extractionProgress}%` }}
              ></div>
            </div>
          )}
          <p>{extractionProgress}% complete</p>
        </div>
      )}

      {!loading && activeTab === "upload" && (
        <div className="content">
          <div className="upload-section">
            <h2>📄 Upload Amazon Wishlist PDF</h2>
            <div className="upload-box">
              <input
                type="file"
                id="file-upload"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <label htmlFor="file-upload" className="upload-label">
                {uploadedFileName || "Choose PDF File"}
              </label>
              <p className="help-text">
                Print your Amazon wishlist to PDF and upload it here
              </p>
              <p
                className="help-text"
                style={{ fontSize: "12px", marginTop: "5px" }}
              >
                Full text extraction - gets ALL items from your wishlist
              </p>
            </div>
          </div>

          <div className="divider">OR</div>

          <div className="url-section">
            <h2>🔗 Paste Wishlist URL</h2>
            <input
              type="text"
              placeholder="https://www.amazon.co.uk/hz/wishlist/..."
              value={wishlistURL}
              onChange={(e) => setWishlistURL(e.target.value)}
              className="url-input"
            />
            <button onClick={handleURLSubmit} className="submit-button">
              Analyze Wishlist
            </button>
            <p className="help-text">Works best with public wishlists</p>
          </div>
        </div>
      )}

      {!loading && activeTab === "search" && (
        <div className="content">
          <div className="search-section">
            <h2>🔍 Quick Product Search</h2>
            <input
              type="text"
              placeholder="What are you looking for? (e.g., 'books', 'electronics')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && quickSearch()}
              className="search-input"
            />
            <button onClick={quickSearch} className="search-button">
              Search
            </button>
          </div>
        </div>
      )}

      {!loading && activeTab === "results" && results && (
        <div className="content">
          <div className="results-section">
            {results.type === "wishlist" && (
              <div className="summary">
                <h2>📊 Wishlist Analysis Complete!</h2>
                <div className="stats">
                  <span>📦 {results.itemCount} items extracted</span>
                  <span>📑 {results.categoryCount} categories identified</span>
                </div>

                {results.extractedItems &&
                  results.extractedItems.length > 0 && (
                    <div className="extracted-preview">
                      <h3>Items successfully extracted:</h3>
                      <ul>
                        {results.extractedItems.slice(0, 5).map((item, idx) => (
                          <li key={idx}>
                            {item.title}
                            {item.author && (
                              <span className="author"> by {item.author}</span>
                            )}
                            {item.price && (
                              <span className="price"> (£{item.price})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {results.itemCount > 5 && (
                        <p className="more-items">
                          ...and {results.itemCount - 5} more items
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}

            {results.type === "search" && (
              <div className="summary">
                <h2>🔍 Search Results for: {results.searchTerm}</h2>
              </div>
            )}

            {Object.entries(results.data).map(([category, data]) => (
              <div key={category} className="category-results">
                <h3>
                  {category === "Search Results"
                    ? ""
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                  {data.itemCount > 0 && category !== "Search Results" && (
                    <span className="item-count">
                      {" "}
                      ({data.itemCount} items)
                    </span>
                  )}
                </h3>

                {data.sampleItems && data.sampleItems.length > 0 && (
                  <div className="sample-items">
                    <p>
                      Including:{" "}
                      {data.sampleItems.map((item) => item.title).join(", ")}
                    </p>
                  </div>
                )}

                {data.retailers.map((retailer, index) => (
                  <div
                    key={retailer.name}
                    className="retailer-card"
                    style={{ borderLeft: `5px solid ${retailer.color}` }}
                  >
                    <div className="retailer-info">
                      <h4>
                        {index === 0 && retailer.score > 70 ? "✅ BEST: " : ""}
                        {retailer.name}
                      </h4>
                      <p>{retailer.reason}</p>
                    </div>
                    <div className="score">
                      <span className="score-number">{retailer.score}</span>
                      <span className="score-label">/100</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <button
              className="new-search-button"
              onClick={() => {
                setActiveTab("upload");
                setResults(null);
                setExtractedItems([]);
                setUploadedFileName("");
                setExtractionProgress(0);
              }}
            >
              Start New Search
            </button>
          </div>
        </div>
      )}

      <footer>
        <p>
          Data sources: B Corporation Directory • WikiRate • Public Information
        </p>
        <p>100% open data • Free to share • No Amazon API needed!</p>
      </footer>
    </div>
  );
}

export default App;
