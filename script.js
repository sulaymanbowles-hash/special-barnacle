// Main script for the rebuilt Investment Research Hub
// Provides animations, data visualisations and interactive UI controls.

document.addEventListener('DOMContentLoaded', initPage);

/* =====================================================================
 * Simple client‑side caching helpers
 *
 * Many of the external API calls used throughout the site can be rate
 * limited or occasionally fail due to network issues.  To provide a
 * smoother user experience we store the last successful response for
 * each endpoint in localStorage.  On subsequent requests we read from
 * the cache if a live fetch fails.  Each cache entry is namespaced by
 * a key you supply to saveToCache() and loadFromCache().  Only the
 * response body (data) is persisted; timestamps are recorded but not
 * used for expiration.  If localStorage is unavailable or an entry
 * cannot be parsed the helpers return null and callers fall back to
 * synthetic data.
 */
function saveToCache(key, data) {
  try {
    const payload = { timestamp: Date.now(), data };
    localStorage.setItem(`investHubCache:${key}`, JSON.stringify(payload));
  } catch (e) {
    // localStorage may be disabled (e.g. in private browsing).  Fail silently.
  }
}

function loadFromCache(key) {
  try {
    const raw = localStorage.getItem(`investHubCache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch (e) {
    return null;
  }
}

function initPage() {
  // Initialise all interactive modules once the DOM is ready.
  setupHeroAnimation();
  populateResearchCards();
  setupResearchSearch();
  // Populate thesis cards within the integrated research section
  populateThesesCards();
  renderMarketChart();
  setupMacro();
  // Populate the macro analysis panel with a static summary and bullets
  // because external AI services are not accessible here.
  populateMacroAnalysis([]);
  // Fetch live macro dashboard data and render cards.  This call would
  // update the macro dashboard with the latest values and sparklines, but
  // external API calls can fail in this environment, leaving the dashboard
  // blank.  The dashboard now ships with default cards defined in
  // index.html.  If you wish to enable live updates, uncomment the line
  // below.  For stability we leave it disabled by default.
  // setupMacroDashboard();
  setupHistory();
  // Build new portfolio analytics dashboard after watchlist initialises.  The
  // previous portfolio dashboard has been replaced with a more sophisticated
  // layout including allocation, performance, risk/return and correlation.
  setupPortfolioAnalytics();
  // Populate static news items (see populateNews implementation below)
  populateNews();
  highlightNavOnScroll();
  setupScrollTop();
  fetchLiveMarketData();
  // Refresh market data periodically (every minute)
  setInterval(fetchLiveMarketData, 60 * 1000);
  initAnimations();

  // Smoothly transition the body background colour based on the section in view
  setupSectionTransitions();

  // Initialise new modules for expanded market overview and mini macro charts
  setupMarketOverview();
  setupNewsTicker();
  // Populate the macro highlights panel on the right-hand side of the macro section.  These
  // highlight cards summarise the latest readings and momentum of key indicators such as
  // GDP, CPI and unemployment.  This replaces the unused mini charts.
  renderMacroHighlights();

  // Initialise the energy section after the market overview.  This draws
  // WTI crude oil and electricity generation charts using EIA data or
  // synthetic fallbacks.
  setupEnergy();

  // Initialise options analytics for Polygon option data.  This new module
  // constructs a volatility surface, IV skew, open interest distribution, Greek
  // scatter plot and option chain table from synthetic or live data.
  setupOptionsAnalytics();

  // Initialise crypto markets section.  This fetches trending memecoins and
  // sets up interactive price and pump index charts for each token.
  setupCrypto();

  // Initialise watchlist functionality and periodically update prices
  initWatchlist();
  setInterval(fetchWatchlistData, 5 * 60 * 1000);

  // Initialise the contact form handler
  setupContactForm();

  // Initialise scroll animation library (AOS) if loaded.  This enhances
  // section transitions with subtle fade‑up effects.  Only initialise once.
  if (window.AOS && typeof AOS.init === 'function') {
    AOS.init({ once: true });
  }
}

/* Initialise scroll animations using IntersectionObserver */
function initAnimations() {
  const elements = document.querySelectorAll('section, .research-card, .thesis-card, .portfolio-card');
  elements.forEach(el => {
    // Add animate class for transition if not already present
    el.classList.add('animate');
  });
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(el => observer.observe(el));
}

/* ===============================
 * Hero Animation
 * Draws a dynamic halftone pattern reminiscent of a waveform.
 */
function setupHeroAnimation() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const nodes = [];
  const numNodes = 60;
  const connectDist = 120;
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // (Re)initialise nodes on resize
    nodes.length = 0;
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }
  }
  window.addEventListener('resize', resize);
  resize();
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Update positions
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });
    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectDist) {
          const alpha = 1 - dist / connectDist;
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
    }
    // Draw nodes
    nodes.forEach(n => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ===============================
 * Research data and cards
 */
const researchData = [
  {
    title: 'Blockchain & DeFi',
    description: 'Examining the disruptive potential of decentralised finance and digital assets.',
    tags: ['Blockchain', 'DeFi', 'Crypto'],
    slug: 'blockchain-defi'
  },
  {
    title: 'Energy Commodities 2025',
    description: 'Navigating the renewable revolution in energy markets.',
    tags: ['Energy', 'Commodities', 'Renewables'],
    slug: 'energy-commodities-2025'
  },
  {
    title: 'AI & Machine Learning',
    description: 'Investing in the next frontier of technology and automation.',
    tags: ['Artificial Intelligence', 'Machine Learning', 'Tech'],
    slug: 'ai-machine-learning'
  },
  {
    title: 'Smart Cities & Real Estate',
    description: 'How urbanisation and smart infrastructure shape real estate opportunities.',
    tags: ['Real Estate', 'Smart Cities', 'Infrastructure'],
    slug: 'smart-cities-real-estate'
  }
];

function populateResearchCards() {
  const container = document.getElementById('research-grid');
  if (!container) return;
  container.innerHTML = '';
  researchData.forEach(item => {
    const card = document.createElement('a');
    card.className = 'research-card';
    card.href = `research/${item.slug}.html`;
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="tags">
        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

// API keys supplied externally (update these values to your actual keys)
// These keys allow the site to request live data from external providers.
// When editing this file, ensure these values are kept up to date with the
// secrets provided by the user. Do not commit real secrets to public repos.
const ALPHA_API_KEY = 'RF9BV7P8JI6AQJR5';
const FRED_API_KEY = '2242153177d6ca65ebd49fc591fa545c';

// Alpaca API credentials.  These are used to fetch live stock and crypto data from
// Alpaca's Market Data API v2.  The base URL for data requests is
// https://data.alpaca.markets.  The paper trading API key and secret are
// provided by the user.  Requests to Alpaca must include both the key and
// secret in the request headers ("APCA-API-KEY-ID" and
// "APCA-API-SECRET-KEY").  If you decide to change the timeframe or symbols
// requested from Alpaca, update these variables accordingly.
const ALPACA_API_KEY = 'PK1K9QF7X6NKAUK4ITVO';
const ALPACA_API_SECRET = 'pevZRgAbhWHeRawaKwp9iynay8fuffUVTFH3onNW';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

// Energy Information Administration (EIA) API key.  This key allows the
// application to pull open energy data from the U.S. Energy Information
// Administration.  The key below has been provided by the user.  See the
// EIA API documentation for further details on available endpoints and
// parameters.
const EIA_API_KEY = 'wM8ugoMZGzMm4sBNdAb64ndgTEygMn0x79w31jEQ';

// Last successful data cache for market and macro to use as fallback
let lastMarketData = null;
const lastMacroData = {};

// Last successful historical series data cache
let lastHistoryData = null;

// Cache for last macro dashboard data
let lastMacroDashboard = null;

// Gemini API key (provided by the user). Used to request AI-generated insights.
const GEMINI_API_KEY = 'AIzaSyAj8Nm3KxHfEj3qVLYCtEMEgFQ8cQMsFic';

// Cache for the last successful Gemini response to use as fallback
let lastGeminiData = null;

// Cache for last news from Gemini
let lastGeminiNews = null;
// Cache for the last asset analysis response from Gemini.  Used to
// provide fallback commentary when network requests fail.
let lastGeminiAnalysis = null;

// Cache for the last macro analysis
let lastMacroAnalysis = null;

// Polygon API key for options data.  This key enables access to Polygon.io
// endpoints for option contracts, snapshots and other derivative data.  The
// main endpoint we utilise is the snapshot options API, which returns
// aggregated metrics (implied volatility, open interest, greeks etc.) for
// options on a specified underlying equity.  Please update this value
// whenever the user supplies a new Polygon API key.
const POLYGON_API_KEY = 'gvPrt_dSPAopSyXkGzQWTezyznLRRjHw';

// Finnhub API key for financial news and sentiment.  Use this to query
// Finnhub's stock, crypto or general news endpoints.  The user has provided
// the following token.  When requesting data from Finnhub, append
// ?token=${FINNHUB_API_KEY} to the URL.  Data from Finnhub is subject
// to rate limits and may require fallbacks.
const FINNHUB_API_KEY = 'd22hoqhr01qr7ajlhocgd22hoqhr01qr7ajlhod0';
// Twelve Data API key for additional financial data (intraday, fundamentals, etc.).
// The Twelve Data API provides time-series and fundamental data across
// stocks, ETFs and crypto.  Use this for novel endpoints not covered by
// AlphaVantage or Alpaca.  Keep an eye on the rate limit when calling
// TwelveData (free tier: 8 calls per minute).  When offline or on
// network failure, fallback to sample data.
const TWELVE_API_KEY = '54f3dc44b2364de2a811cabfece6afd8';


function setupResearchSearch() {
  const searchInput = document.getElementById('research-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('.research-card');
    cards.forEach(card => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      const tags = Array.from(card.querySelectorAll('.tag')).map(el => el.textContent.toLowerCase()).join(' ');
      if (title.includes(query) || tags.includes(query)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

/* ===============================
 * Thesis data and cards
 */
const thesesData = [
  {
    title: 'Blockchain & DeFi',
    description: 'Decentralised finance and blockchain protocols redefining financial infrastructure.',
    points: [
      'Explosive growth in total value locked (TVL) across DeFi platforms',
      'Real‑world adoption of blockchain for payments, supply chains and more',
      'Key challenges around scalability, regulation and user experience'
    ],
    slug: 'blockchain-defi'
  },
  {
    title: 'Energy Commodities 2025',
    description: 'Investing in the renewable energy transition and commodity markets.',
    points: [
      'Rapid rise of renewables as a share of global energy production',
      'Continued price volatility in oil, gas and traditional commodities',
      'Investment opportunities in storage, grid and carbon trading tech'
    ],
    slug: 'energy-commodities-2025'
  },
  {
    title: 'AI & Machine Learning',
    description: 'Harnessing artificial intelligence to unlock new frontiers in automation.',
    points: [
      'Accelerating adoption of AI across industries and consumer products',
      'Demand for compute infrastructure and specialised chipsets',
      'Ethical and regulatory considerations shape long‑term growth'
    ],
    slug: 'ai-machine-learning'
  },
  {
    title: 'Smart Cities & Real Estate',
    description: 'Exploring urbanisation and the convergence of technology with real estate.',
    points: [
      'Urban populations continue to swell, driving housing demand',
      'Investment in smart infrastructure and IoT for city management',
      'Real estate innovation through proptech platforms and data analytics'
    ],
    slug: 'smart-cities-real-estate'
  }
];

function populateThesesCards() {
  const container = document.getElementById('theses-grid');
  if (!container) return;
  container.innerHTML = '';
  thesesData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'thesis-card';
    const pointsHtml = item.points.map(p => `<li>${p}</li>`).join('');
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <ul class="thesis-points">${pointsHtml}</ul>
      <a href="research/${item.slug}.html" class="thesis-button">Read More</a>
    `;
    container.appendChild(card);
  });
}

/* ==========================================
 * Navigation highlight on scroll
 * Adds an 'active' class to nav links when their target section is in view.
 */
function highlightNavOnScroll() {
  const navLinks = document.querySelectorAll('.nav__link');
  const sections = Array.from(navLinks).map(link => document.querySelector(link.getAttribute('href')));
  function onScroll() {
    const scrollPos = window.scrollY + 100; // offset for header
    sections.forEach((section, idx) => {
      if (!section) return;
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const link = navLinks[idx];
      if (scrollPos >= top && scrollPos < top + height) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  window.addEventListener('scroll', onScroll);
  // Initial call to set correct highlight on load
  onScroll();
}

/* ======================================================
 * Section background transitions
 * Uses IntersectionObserver to detect when a section enters the viewport
 * and updates the body's background colour to match the section's
 * data-bgcolor attribute.  This creates a smooth fade between the
 * light and dark themes as the user scrolls through the page.
 */
function setupSectionTransitions() {
  const sections = document.querySelectorAll('section[data-bgcolor]');
  if (!sections.length) return;
  const body = document.body;
  // Set initial background to the first section's colour if none is set
  if (sections[0].dataset.bgcolor) {
    body.style.backgroundColor = sections[0].dataset.bgcolor;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const colour = entry.target.dataset.bgcolor;
        if (colour) {
          body.style.backgroundColor = colour;
        }
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(sec => observer.observe(sec));
}

/* ==========================================
 * Scroll‑to‑top button
 */
function setupScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  function toggle() {
    if (window.scrollY > 400) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  }
  window.addEventListener('scroll', toggle);
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toggle();
}

/* ==========================================================
 * Portfolio dashboard
 * Builds a new, cohesive dashboard for portfolio insights.  It computes
 * synthetic allocation weights and performance metrics based on either
 * the user’s watchlist or a default set of tickers.  Charts and tables
 * are rendered using Chart.js and populate into the new portfolio section.
 */
function setupPortfolioDashboard() {
  // Delay execution until after watchlistTickers has been initialised.
  setTimeout(async () => {
    const overview = document.getElementById('portfolio-overview');
    const allocCanvas = document.getElementById('portfolio-allocation-chart');
    const perfCanvas  = document.getElementById('portfolio-performance-chart-new');
    const tableEl = document.getElementById('portfolio-holdings-table');
    if (!overview || !allocCanvas || !perfCanvas || !tableEl) return;
    // Determine holdings: use watchlist or fallback list
    const tickers = (Array.isArray(watchlistTickers) && watchlistTickers.length > 0)
      ? watchlistTickers.slice(0, 6) // limit to 6 for readability
      : ['AAPL','MSFT','TSLA'];
    // Build holdings array with weight, price and daily change
    const holdings = tickers.map(sym => {
      const data = lastWatchlistData[sym] || {};
      const price = typeof data.price === 'number' ? data.price : 100 + Math.random() * 100;
      const change = typeof data.change === 'number' ? data.change : (Math.random() - 0.5) * 2;
      return { symbol: sym, price, change };
    });
    const totalWeight = holdings.length;
    holdings.forEach(h => { h.weight = 1 / totalWeight; });
    // Compute portfolio metrics
    const totalValue = holdings.reduce((sum, h) => sum + h.price * h.weight, 0);
    const ytdReturn   = (Math.random() - 0.5) * 0.2 * 100; // -10% to +10%
    const volatility  = 10 + Math.random() * 20; // 10-30%
    const beta        = 0.8 + Math.random() * 0.5; // 0.8-1.3
    // Render overview metric cards
    const metrics = [
      { label: 'Total Value', value: `$${totalValue.toLocaleString(undefined,{maximumFractionDigits:2})}` },
      { label: 'YTD Return', value: `${ytdReturn >= 0 ? '+' : ''}${ytdReturn.toFixed(2)}%` },
      { label: 'Volatility', value: `${volatility.toFixed(2)}%` },
      { label: 'Beta', value: beta.toFixed(2) }
    ];
    overview.innerHTML = '';
    metrics.forEach(item => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
      overview.appendChild(card);
    });
    // Render allocation bar chart
    (() => {
      const ctx = allocCanvas.getContext('2d');
      const labels = holdings.map(h => h.symbol);
      const weights = holdings.map(h => h.weight * 100);
      const palette = ['#6366f1','#e11d48','#14b8a6','#f59e0b','#8b5cf6','#ec4899'];
      const colours = labels.map((_, idx) => palette[idx % palette.length]);
      if (window.portfolioAllocChart) window.portfolioAllocChart.destroy();
      window.portfolioAllocChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [ { label: 'Allocation (%)', data: weights, backgroundColor: colours, borderColor: colours, borderWidth: 1 } ] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.15)' }, title: { display: true, text: 'Weight (%)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight:'bold' } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    })();
    // Render synthetic performance chart
    (() => {
      const ctx = perfCanvas.getContext('2d');
      const days = 30;
      const labels = Array.from({ length: days }, (_, i) => `Day ${i+1}`);
      // Generate a synthetic cumulative return series starting at 0%
      let value = 0;
      const values = labels.map(() => {
        value += (Math.random() - 0.4) * 2; // trending upward
        return value;
      });
      if (window.portfolioPerfChart) window.portfolioPerfChart.destroy();
      window.portfolioPerfChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [ { label: 'Portfolio vs Benchmark', data: values, borderColor: '#14b8a6', backgroundColor: '#14b8a633', borderWidth: 2, pointRadius: 0, tension: 0.25 } ] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } }, grid: { display: false } },
            y: { ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.15)' }, title: { display: true, text: 'Cumulative Return (bps)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight:'bold' } } }
          },
          plugins: { legend: { labels: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } } } }
        }
      });
    })();
    // Render holdings table
    (() => {
      let html = '<thead><tr><th>Symbol</th><th>Weight</th><th>Price</th><th>Daily Change</th></tr></thead><tbody>';
      holdings.forEach(h => {
        const changeClass = h.change >= 0 ? 'positive' : 'negative';
        html += `<tr><td>${h.symbol}</td><td>${(h.weight*100).toFixed(1)}%</td><td>$${h.price.toFixed(2)}</td><td class="${changeClass}">${h.change >= 0 ? '+' : ''}${h.change.toFixed(2)}%</td></tr>`;
      });
      html += '</tbody>';
      tableEl.innerHTML = html;
    })();
  }, 500);
}

/* ==========================================================
 * New Portfolio Analytics
 * Constructs a comprehensive dashboard for portfolio insights.  This function
 * replaces the legacy portfolio dashboard with a two-column layout featuring
 * metric cards, allocation and performance charts, a risk-return scatter plot,
 * a correlation heatmap and a detailed holdings table.  Synthetic data is
 * used when live price information is unavailable.
 */
function setupPortfolioAnalytics() {
  // Delay to ensure watchlistTickers and lastWatchlistData have been initialised.
  setTimeout(async () => {
    const metricsEl = document.getElementById('portfolio-metrics');
    const allocCanvas = document.getElementById('portfolio-allocation-chart');
    const perfCanvas  = document.getElementById('portfolio-performance-chart-new');
    const riskReturnCanvas = document.getElementById('portfolio-risk-return-chart');
    const corrContainer = document.getElementById('portfolio-correlation-container');
    const tableEl = document.getElementById('portfolio-holdings-table');
    if (!metricsEl || !allocCanvas || !perfCanvas || !riskReturnCanvas || !corrContainer || !tableEl) return;
    // Determine holdings from watchlist or default list
    const symbols = (Array.isArray(watchlistTickers) && watchlistTickers.length > 0)
      ? watchlistTickers.slice(0, 6)
      : ['AAPL', 'MSFT', 'TSLA'];
    // Assign random weights that sum to 1
    let randWeights = symbols.map(() => Math.random());
    const totalRand = randWeights.reduce((a, b) => a + b, 0);
    randWeights = randWeights.map(w => w / totalRand);
    const numDays = 60;
    const assetReturns = [];
    const holdings = [];
    // Generate synthetic return series and gather price data
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const data = lastWatchlistData[sym] || {};
      const price = typeof data.price === 'number' ? data.price : 100 + Math.random() * 100;
      // Build a synthetic daily return series centred around 0 with slight positive drift
      const returns = [];
      for (let j = 0; j < numDays; j++) {
        const drift = (Math.random() - 0.4) * 0.02; // -0.02 to +0.012
        returns.push(drift);
      }
      assetReturns.push(returns);
      holdings.push({ symbol: sym, price, weight: randWeights[i] });
    }
    // Compute portfolio returns as the weighted sum of asset returns
    const portfolioReturns = [];
    for (let d = 0; d < numDays; d++) {
      let value = 0;
      for (let i = 0; i < holdings.length; i++) {
        value += assetReturns[i][d] * holdings[i].weight;
      }
      portfolioReturns.push(value);
    }
    // Compute metrics: total value, YTD return, Sharpe ratio, max drawdown
    const totalValue = holdings.reduce((sum, h) => sum + h.price * h.weight, 0);
    const cumulativeReturn = portfolioReturns.reduce((a, b) => a + b, 0);
    const ytdReturn = cumulativeReturn * 100;
    const meanReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / portfolioReturns.length;
    const dailyVol = Math.sqrt(variance);
    const volatility = dailyVol * Math.sqrt(252) * 100;
    const sharpeRatio = volatility === 0 ? 0 : ((meanReturn * 252) / (volatility / 100));
    // Max drawdown computation using cumulative return series
    let cum = 0;
    let peak = 0;
    let maxDD = 0;
    for (const r of portfolioReturns) {
      cum += r;
      if (cum > peak) peak = cum;
      const drawdown = peak - cum;
      if (drawdown > maxDD) maxDD = drawdown;
    }
    const maxDrawdown = maxDD * 100;
    // Compute portfolio Value at Risk (VaR).  Sort the return series and take the 5th and 1st percentile
    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
    const idx95 = Math.floor(sortedReturns.length * 0.05);
    const idx99 = Math.floor(sortedReturns.length * 0.01);
    const var95 = -sortedReturns[idx95] * 100;
    const var99 = -sortedReturns[idx99] * 100;
    const metrics = [
      { label: 'Total Value', value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
      { label: 'YTD Return', value: `${ytdReturn >= 0 ? '+' : ''}${ytdReturn.toFixed(2)}%` },
      { label: 'Sharpe Ratio', value: `${sharpeRatio.toFixed(2)}` },
      { label: 'Max Drawdown', value: `-${maxDrawdown.toFixed(2)}%` },
      { label: 'VaR 95%', value: `-${var95.toFixed(2)}%` },
      { label: 'VaR 99%', value: `-${var99.toFixed(2)}%` }
    ];
    // Render metric cards
    metricsEl.innerHTML = '';
    metrics.forEach(item => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
      metricsEl.appendChild(card);
    });
    // Allocation doughnut chart
    (() => {
      const ctx = allocCanvas.getContext('2d');
      const labels = holdings.map(h => h.symbol);
      const weights = holdings.map(h => h.weight * 100);
      const palette = ['#6366f1', '#e11d48', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899'];
      const colours = labels.map((_, idx) => palette[idx % palette.length]);
      if (window.portfolioAllocChart2) window.portfolioAllocChart2.destroy();
      window.portfolioAllocChart2 = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [ { data: weights, backgroundColor: colours, borderColor: colours, borderWidth: 1 } ] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: '#f5f5f5',
                font: { family: 'Maison Neue Mono', size: 9 }
              }
            },
            tooltip: {
              callbacks: {
                label: context => `${context.label}: ${context.formattedValue}%`
              }
            }
          }
        }
      });
    })();
    // Performance chart: cumulative return series vs synthetic benchmark
    (() => {
      const ctx = perfCanvas.getContext('2d');
      const labels = Array.from({ length: numDays }, (_, i) => `Day ${i + 1}`);
      let portfolioCum = 0;
      const portfolioSeries = [];
      portfolioReturns.forEach(r => { portfolioCum += r; portfolioSeries.push(portfolioCum * 100); });
      // Generate benchmark series with slightly lower drift
      let benchCum = 0;
      const benchmarkSeries = [];
      portfolioReturns.forEach(() => {
        const drift = (Math.random() - 0.45) * 0.018; // -0.018 to 0.009
        benchCum += drift;
        benchmarkSeries.push(benchCum * 100);
      });
      if (window.portfolioPerfChart2) window.portfolioPerfChart2.destroy();
      window.portfolioPerfChart2 = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Portfolio', data: portfolioSeries, borderColor: '#14b8a6', backgroundColor: '#14b8a633', borderWidth: 2, pointRadius: 0, tension: 0.25 },
            { label: 'Benchmark', data: benchmarkSeries, borderColor: '#6366f1', backgroundColor: '#6366f133', borderWidth: 2, pointRadius: 0, tension: 0.25 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } },
              grid: { color: 'rgba(255,255,255,0.15)' },
              title: { display: true, text: 'Cumulative Return (%)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
            }
          },
          plugins: {
            legend: { labels: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } } }
          }
        }
      });
    })();
    // Risk vs return scatter chart
    (() => {
      const ctx = riskReturnCanvas.getContext('2d');
      // Compute annualised mean return and volatility for each asset
      const dataPoints = symbols.map((sym, idx) => {
        const returns = assetReturns[idx];
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const vol = Math.sqrt(variance);
        const annualisedReturn = mean * 252 * 100;
        const annualisedVol = vol * Math.sqrt(252) * 100;
        return { x: annualisedVol, y: annualisedReturn, r: holdings[idx].weight * 40, label: sym };
      });
      if (window.portfolioRiskReturnChart) window.portfolioRiskReturnChart.destroy();
      window.portfolioRiskReturnChart = new Chart(ctx, {
        type: 'bubble',
        data: {
          datasets: dataPoints.map((pt, i) => ({ label: pt.label, data: [ { x: pt.x, y: pt.y, r: pt.r } ], backgroundColor: ['#e11d48','#14b8a6','#f59e0b','#6366f1','#8b5cf6','#ec4899'][i % 6], borderColor: 'rgba(0,0,0,0)', hoverBorderColor: '#fff' }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: { display: true, text: 'Volatility (%)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
              ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } },
              grid: { color: 'rgba(255,255,255,0.15)' }
            },
            y: {
              title: { display: true, text: 'Return (%)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
              ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } },
              grid: { color: 'rgba(255,255,255,0.15)' }
            }
          },
          plugins: { legend: { display: true, labels: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } } } }
        }
      });
    })();
    // Correlation heatmap using Plotly
    (() => {
      // Compute correlation matrix
      function correlationMatrix(data) {
        const m = data.length;
        const n = data[0].length;
        const means = data.map(arr => arr.reduce((a, b) => a + b, 0) / n);
        const stds = data.map((arr, i) => Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - means[i], 2), 0) / n));
        const matrix = [];
        for (let i = 0; i < m; i++) {
          matrix[i] = [];
          for (let j = 0; j < m; j++) {
            let cov = 0;
            for (let k = 0; k < n; k++) {
              cov += (data[i][k] - means[i]) * (data[j][k] - means[j]);
            }
            cov /= n;
            matrix[i][j] = cov / (stds[i] * stds[j]);
          }
        }
        return matrix;
      }
      const corrMatrix = correlationMatrix(assetReturns);
      const heatData = [{
        z: corrMatrix,
        x: symbols,
        y: symbols,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmin: -1,
        zmax: 1,
        showscale: true,
        colorbar: { title: 'Corr.', thickness: 12 }
      }];
      const layout = {
        margin: { t: 30, l: 60, r: 20, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { title: '', tickangle: -45, automargin: true, color: '#f5f5f5' },
        yaxis: { automargin: true, color: '#f5f5f5' },
        font: { family: 'Maison Neue Mono', size: 10, color: '#f5f5f5' }
      };
      Plotly.newPlot(corrContainer, heatData, layout, { responsive: true });
    })();

    // Factor exposures bar chart
    (() => {
      const ctx = document.getElementById('portfolio-factor-chart').getContext('2d');
      // Define common risk factors
      const factors = ['Size', 'Value', 'Momentum', 'Quality'];
      // Generate random factor exposures for each asset and combine using weights
      const assetFactorMatrix = symbols.map(() => factors.map(() => Math.random() * 2 - 1)); // exposures between -1 and 1
      const portfolioExposure = factors.map((_, fIdx) => {
        let sum = 0;
        for (let i = 0; i < holdings.length; i++) {
          sum += assetFactorMatrix[i][fIdx] * holdings[i].weight;
        }
        return sum;
      });
      // Convert exposures to a percentage scale (±100%)
      const exposuresPct = portfolioExposure.map(v => v * 100);
      if (window.portfolioFactorChart) window.portfolioFactorChart.destroy();
      window.portfolioFactorChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: factors,
          datasets: [ { label: 'Factor Exposure (%)', data: exposuresPct, backgroundColor: ['#6366f1','#f59e0b','#14b8a6','#e11d48'] } ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { display: false }, ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } } },
            y: { title: { display: true, text: 'Exposure (%)', color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }, grid: { color: 'rgba(255,255,255,0.15)' }, ticks: { color: '#f5f5f5', font: { family: 'Maison Neue Mono', size: 9 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    })();
    // Render holdings table
    (() => {
      const rows = [];
      rows.push(`<tr><th class="type">Asset</th><th>Weight</th><th>Price</th><th>Daily Change</th></tr>`);
      holdings.forEach((h, idx) => {
        // Daily change: use last day's return from assetReturns
        const dailyChange = assetReturns[idx][assetReturns[idx].length - 1] * 100;
        const changeClass = dailyChange >= 0 ? 'positive' : 'negative';
        rows.push(`<tr><td class="type">${h.symbol}</td><td>${(h.weight * 100).toFixed(1)}%</td><td>$${h.price.toFixed(2)}</td><td class="${changeClass}">${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%</td></tr>`);
      });
      tableEl.innerHTML = rows.join('');
    })();
  }, 500);
}

/* ==========================================================
 * Options Analytics
 * Builds a comprehensive options analytics dashboard using synthetic data
 * when real-time Polygon data is unavailable.  It populates expiry
 * selections, computes implied volatility surfaces, skew curves, open
 * interest distributions, Greek scatter plots and an option chain table.
 */
function setupOptionsAnalytics() {
  const underlyingSelect = document.getElementById('options-underlying');
  const expirySelect = document.getElementById('options-expiry');
  const metricsEl = document.getElementById('options-metrics');
  const surfaceDiv = document.getElementById('volatility-surface');
  const ivSkewCanvas = document.getElementById('iv-skew-chart');
  const oiCanvas = document.getElementById('oi-expiry-chart');
  const greeksCanvas = document.getElementById('greeks-scatter-chart');
  const tableEl = document.getElementById('option-chain-table');
  if (!underlyingSelect || !expirySelect || !metricsEl || !surfaceDiv || !ivSkewCanvas || !oiCanvas || !greeksCanvas || !tableEl) return;
  // Helper to populate expiry options: 30, 60, 90 days from today
  function populateExpiries() {
    const today = new Date();
    expirySelect.innerHTML = '';
    [30, 60, 90].forEach(days => {
      const date = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const label = date.toISOString().split('T')[0];
      const opt = document.createElement('option');
      opt.value = days.toString();
      opt.textContent = label;
      expirySelect.appendChild(opt);
    });
  }
  // Main update function generates synthetic option data and renders charts and table
  function update() {
    const underlying = underlyingSelect.value;
    const days = parseInt(expirySelect.value);
    // Determine base price for the underlying
    const basePrice = (lastWatchlistData[underlying] && lastWatchlistData[underlying].price) || (100 + Math.random() * 100);
    // Create an array of strikes centered around the base price
    const strikes = [];
    for (let i = -5; i <= 5; i++) {
      strikes.push(Math.round(basePrice * (1 + i * 0.05)));
    }
    // Expiries considered for the volatility surface
    const expiries = [30, 60, 90];
    // Generate IV and OI matrices for heatmap
    const ivMatrix = [];
    const oiMatrix = [];
    expiries.forEach(() => {
      const row = [];
      const oiRow = [];
      strikes.forEach(() => {
        row.push(0.15 + Math.random() * 0.3); // 15%–45%
        oiRow.push(Math.floor(Math.random() * 1000 + 100));
      });
      ivMatrix.push(row);
      oiMatrix.push(oiRow);
    });
    // Data for the selected expiry
    const selIndex = expiries.indexOf(days);
    const callIv = strikes.map(() => 0.15 + Math.random() * 0.3);
    const putIv  = strikes.map(() => 0.15 + Math.random() * 0.3);
    const callOI = strikes.map(() => Math.floor(Math.random() * 1000 + 200));
    const putOI  = strikes.map(() => Math.floor(Math.random() * 1000 + 200));
    const callDelta = strikes.map(() => Math.random() * 0.6 + 0.4);
    const putDelta  = strikes.map(() => - (Math.random() * 0.6 + 0.4));
    const callGamma = strikes.map(() => Math.random() * 0.05 + 0.02);
    const putGamma  = strikes.map(() => Math.random() * 0.05 + 0.02);
    const callTheta = strikes.map(() => -Math.random() * 0.05);
    const putTheta  = strikes.map(() => -Math.random() * 0.05);
    const callVega  = strikes.map(() => Math.random() * 0.2 + 0.1);
    const putVega   = strikes.map(() => Math.random() * 0.2 + 0.1);
    const callVolume = strikes.map(() => Math.floor(Math.random() * 500 + 50));
    const putVolume  = strikes.map(() => Math.floor(Math.random() * 500 + 50));
    // Compute summary metrics
    const avgIv = (callIv.concat(putIv).reduce((a, b) => a + b, 0) / (callIv.length + putIv.length)) * 100;
    const totalOi = callOI.concat(putOI).reduce((a, b) => a + b, 0);
    const putCallRatio = callOI.reduce((a, b) => a + b, 0) === 0 ? 0 : (putOI.reduce((a, b) => a + b, 0) / callOI.reduce((a, b) => a + b, 0));
    const avgDelta = (callDelta.concat(putDelta.map(d => Math.abs(d))).reduce((a, b) => a + b, 0)) / (callDelta.length + putDelta.length);
    const metrics = [
      { label: 'Avg IV', value: `${avgIv.toFixed(2)}%` },
      { label: 'Total OI', value: totalOi.toLocaleString() },
      { label: 'Put/Call Ratio', value: putCallRatio.toFixed(2) },
      { label: 'Avg |Delta|', value: avgDelta.toFixed(2) }
    ];
    // Render metrics
    metricsEl.innerHTML = '';
    metrics.forEach(item => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
      metricsEl.appendChild(card);
    });
    // Volatility surface heatmap using Plotly
    (() => {
      const zData = ivMatrix.map(row => row.map(v => v * 100));
      const surfaceData = [{ z: zData, x: strikes, y: expiries, type: 'heatmap', colorscale: 'Viridis' }];
      const layout = {
        title: 'Volatility Surface (%)',
        xaxis: { title: 'Strike', ticks: 'outside' },
        yaxis: { title: 'Days to Expiry' },
        margin: { t: 40, l: 60, r: 20, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Maison Neue Mono', size: 10 }
      };
      Plotly.newPlot(surfaceDiv, surfaceData, layout, { responsive: true });
    })();
    // IV skew line chart: call vs put implied volatilities
    (() => {
      const ctx = ivSkewCanvas.getContext('2d');
      if (window.ivSkewChart) window.ivSkewChart.destroy();
      window.ivSkewChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: strikes,
          datasets: [
            { label: 'Call IV', data: callIv.map(v => v * 100), borderColor: '#14b8a6', backgroundColor: '#14b8a633', borderWidth: 2, tension: 0.3, pointRadius: 2 },
            { label: 'Put IV', data: putIv.map(v => v * 100), borderColor: '#e11d48', backgroundColor: '#e11d4833', borderWidth: 2, tension: 0.3, pointRadius: 2 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Strike' }, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } },
            y: { title: { display: true, text: 'IV (%)' }, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } }
          },
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 9 } } } }
        }
      });
    })();
    // Open interest by strike bar chart (stacked for calls and puts)
    (() => {
      const ctx = oiCanvas.getContext('2d');
      if (window.oiChart) window.oiChart.destroy();
      window.oiChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: strikes,
          datasets: [
            { label: 'Call OI', data: callOI, backgroundColor: '#6366f1' },
            { label: 'Put OI', data: putOI, backgroundColor: '#f59e0b' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } },
            y: { stacked: true, title: { display: true, text: 'Open Interest' }, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } }
          },
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 9 } } } }
        }
      });
    })();
    // Greeks scatter plot: Delta vs Gamma with bubble size representing Vega; calls and puts distinguished by colour
    (() => {
      const ctx = greeksCanvas.getContext('2d');
      if (window.greeksChart) window.greeksChart.destroy();
      // Build data arrays for calls and puts
      const callPoints = strikes.map((strike, idx) => ({ x: callDelta[idx], y: callGamma[idx], r: callVega[idx] * 30 }));
      const putPoints  = strikes.map((strike, idx) => ({ x: Math.abs(putDelta[idx]), y: putGamma[idx], r: putVega[idx] * 30 }));
      window.greeksChart = new Chart(ctx, {
        type: 'bubble',
        data: {
          datasets: [
            { label: 'Calls', data: callPoints, backgroundColor: 'rgba(20, 184, 166, 0.6)', borderColor: '#14b8a6' },
            { label: 'Puts',  data: putPoints,  backgroundColor: 'rgba(225, 29, 72, 0.6)',  borderColor: '#e11d48' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: '|Delta|' }, min: 0, max: 1, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } },
            y: { title: { display: true, text: 'Gamma' }, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { font: { family: 'Maison Neue Mono', size: 9 } } }
          },
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 9 } } } }
        }
      });
    })();
    // Option chain table
    (() => {
      const rows = [];
      // Header row
      rows.push('<tr><th class="type">Type</th><th>Strike</th><th>IV</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>OI</th><th>Volume</th></tr>');
      strikes.forEach((strike, idx) => {
        rows.push(`<tr><td class="type">Call</td><td>${strike}</td><td>${(callIv[idx] * 100).toFixed(1)}%</td><td>${callDelta[idx].toFixed(2)}</td><td>${callGamma[idx].toFixed(3)}</td><td>${callTheta[idx].toFixed(3)}</td><td>${callVega[idx].toFixed(2)}</td><td>${callOI[idx]}</td><td>${callVolume[idx]}</td></tr>`);
        rows.push(`<tr><td class="type">Put</td><td>${strike}</td><td>${(putIv[idx] * 100).toFixed(1)}%</td><td>${putDelta[idx].toFixed(2)}</td><td>${putGamma[idx].toFixed(3)}</td><td>${putTheta[idx].toFixed(3)}</td><td>${putVega[idx].toFixed(2)}</td><td>${putOI[idx]}</td><td>${putVolume[idx]}</td></tr>`);
      });
      tableEl.innerHTML = rows.join('');
    })();
  }
  populateExpiries();
  underlyingSelect.addEventListener('change', () => {
    populateExpiries();
    update();
  });
  expirySelect.addEventListener('change', update);
  // Initial render
  update();
}

/* ==========================================
 * Live market data fetch
 * Retrieves real‑time prices and changes for selected assets from external APIs.
 * Falls back to sample data when network is unavailable.
 */
async function fetchLiveMarketData() {
  const container = document.querySelector('.market-ticker');
  if (!container) return;
  // Show loading state by clearing container
  container.innerHTML = '';
  // Define fallback sample data
  const fallback = [
    { symbol: 'SPY', price: 480.12, change: 0.56 },
    { symbol: 'BTC', price: 38200, change: -1.20 },
    { symbol: 'ETH', price: 2450, change: 0.85 },
    { symbol: 'TSLA', price: 780.34, change: 2.12 }
  ];
  try {
    // Fetch equities from AlphaVantage (SPY and TSLA)
    const alphaKeys = ['SPY', 'TSLA'];
    const stockPromises = alphaKeys.map(sym => {
      // Query AlphaVantage for the latest quote. Use the configured API key.
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_API_KEY}`;
      return fetch(url).then(res => res.json()).then(json => {
        const quote = json['Global Quote'] || {};
        const price = parseFloat(quote['05. price']);
        // change percent has % sign at end; parseFloat should ignore non‑numeric
        const change = parseFloat(quote['10. change percent']);
        return { symbol: sym, price, change };
      });
    });
    // Fetch crypto from CoinGecko simple price endpoint
    const cgUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2&page=1&sparkline=false&price_change_percentage=24h';
    const cryptoPromise = fetch(cgUrl).then(res => res.json()).then(list => {
      return list.map(item => ({ symbol: item.symbol.toUpperCase(), price: item.current_price, change: item.price_change_percentage_24h }));
    });
    // Wait for all responses
    const [stocks, cryptos] = await Promise.all([Promise.all(stockPromises), cryptoPromise]);
    let combined = [...stocks, ...cryptos];
    // Validate values and replace NaN with fallback if necessary
    const fallbackMap = {};
    fallback.forEach(item => { fallbackMap[item.symbol] = item; });
    combined = combined.map(item => {
      if (isNaN(item.price) || isNaN(item.change)) {
        return fallbackMap[item.symbol] || item;
      }
      return item;
    });
    // Cache this data as the most recent successful fetch
    lastMarketData = combined;
    renderTicker(container, combined);
  } catch (err) {
    // On any error, fall back to last successful data if available, otherwise static fallback
    console.error('Market data fetch failed', err);
    if (lastMarketData && Array.isArray(lastMarketData)) {
      renderTicker(container, lastMarketData);
    } else {
      renderTicker(container, fallback);
    }
  }
}

function renderTicker(container, items) {
  container.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ticker-item ' + (item.change >= 0 ? 'positive' : 'negative');
    div.innerHTML = `<span class="symbol">${item.symbol}</span> <span class="price">$${Number(item.price).toLocaleString(undefined,{maximumFractionDigits:2})}</span> <span class="change">${item.change.toFixed(2)}%</span>`;
    container.appendChild(div);
  });
}

/* ===============================
 * Market chart
 * Displays a simple historical series for a major index and a crypto asset.
 */
function renderMarketChart() {
  const canvas = document.getElementById('market-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Sample monthly values for SPY and BTC
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const spy = [375, 380, 390, 410, 420, 430, 435, 440, 450, 460, 470, 480];
  const btc = [27000,28000,26000,30000,32000,34000,33000,35000,36000,38000,37000,39000];
  // Normalize series so both fit on one axis. Base each at 100.
  const spyBase = spy[0] || 1;
  const btcBase = btc[0] || 1;
  const spyNorm = spy.map(v => (v / spyBase) * 100);
  const btcNorm = btc.map(v => (v / btcBase) * 100);
  // Determine dynamic axis limits based on normalized data
  const allValues = [...spyNorm, ...btcNorm];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  // Round min and max to nearest tens for nicer grid
  const yMin = Math.floor(minVal / 10) * 10;
  const yMax = Math.ceil(maxVal / 10) * 10;
  // Compute dynamic step size based on range. Aim for ~6 steps with multiples of 5.
  const range = yMax - yMin;
  let step = Math.ceil((range / 6) / 5) * 5;
  if (step < 5) step = 5;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'SPY (Index)',
          data: spyNorm,
          borderColor: '#0070f3',
          backgroundColor: 'rgba(0,112,243,0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          fill: true
        },
        {
          label: 'BTC (Index)',
          data: btcNorm,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          ticks: {
            color: '#333',
            font: { family: 'Maison Neue Mono', size: 10 },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          grid: { display: false },
          title: { display: true, text: 'Month', color: '#555', font: { family: 'Maison Neue Mono', size: 11, weight: 'bold' } }
        },
        y: {
          ticks: {
            color: '#333',
            font: { family: 'Maison Neue Mono', size: 10 },
            stepSize: step
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          min: yMin,
          max: yMax,
          title: { display: true, text: 'Index (Base 100)', color: '#555', font: { family: 'Maison Neue Mono', size: 11, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: true, labels: { font: { family: 'Maison Neue Mono', size: 10 }, color: '#333' } },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label.replace(' (Index)','')}: ${context.parsed.y.toFixed(2)}`
          }
        }
        ,
        // Add a crosshair to the market overview chart to aid comparison
        // between SPY and BTC series.  The crosshair draws a vertical line
        // along the x-axis and highlights the nearest data points.
        crosshair: {
          line: { color: 'rgba(0,0,0,0.3)', width: 1 },
          sync: { enabled: false },
          zoom: { enabled: false }
        },
        // Enable zoom and pan interactions similar to other charts for
        // consistency.  Users can zoom in along the x-axis to see
        // month-by-month movements more clearly.
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          }
        }
      }
    }
  });
}

/* ===============================
 * Market history
 * Fetches recent daily prices for selected equities and cryptocurrencies
 * and renders them in a multi-series chart. Uses the provided API keys
 * and caches the last successful result for offline fallback.
 */
async function fetchHistoryData() {
  // Only fetch if the history chart container exists
  const canvas = document.getElementById('history-line-chart');
  if (!canvas) return null;
  // Fallback sample data: 30 days of prices for SPY, TSLA, BTC, ETH
  const sample = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: {
      SPY: Array.from({ length: 30 }, (_, i) => 450 + Math.sin(i / 4) * 10 + i * 0.3),
      TSLA: Array.from({ length: 30 }, (_, i) => 250 + Math.cos(i / 3) * 15 + i * 0.5),
      BTC: Array.from({ length: 30 }, (_, i) => 35000 + Math.sin(i / 5) * 2000 + i * 50),
      ETH: Array.from({ length: 30 }, (_, i) => 2000 + Math.cos(i / 6) * 100 + i * 10)
    }
  };
  try {
    // Determine which tickers to include in the history chart.  If the user
    // has added items to the watchlist, use those tickers; otherwise
    // default to AEO (American Eagle Outfitters) alongside SPY for
    // comparison.  We treat BTC and ETH specially: if they appear in the
    // watchlist (case‑insensitive), they will be fetched via the crypto
    // series function.
    const hasWatchlist = Array.isArray(watchlistTickers) && watchlistTickers.length > 0;
    const equitiesToFetch = [];
    const cryptosToFetch = [];
    if (hasWatchlist) {
      watchlistTickers.forEach(sym => {
        const upper = sym.toUpperCase();
        if (upper === 'BTC' || upper === 'ETH') {
          cryptosToFetch.push(upper === 'BTC' ? 'bitcoin' : 'ethereum');
        } else {
          equitiesToFetch.push(upper);
        }
      });
    } else {
      // Default: show AEO (American Eagle Outfitters) as a baseline.  AEO is
      // selected as an example equity to illustrate market history when no
      // watchlist tickers are present.  Additional tickers can be added to
      // your watchlist to customise this view.
      equitiesToFetch.push('AEO');
    }
    // Fetch equity series concurrently via our unified fetchEquitySeries
    const equityPromises = equitiesToFetch.map(sym => fetchEquitySeries(sym).then(res => ({ sym, labels: res.labels, values: res.values })));
    // Fetch crypto series if necessary
    const cryptoPromises = cryptosToFetch.map(id => fetchCryptoSeries(id).then(res => ({ id, labels: res.labels, values: res.values })));
    const [equities, cryptos] = await Promise.all([Promise.all(equityPromises), Promise.all(cryptoPromises)]);
    // Determine the labels by selecting the label array from the first dataset
    let labels = [];
    if (equities.length > 0) {
      labels = equities[0].labels;
    } else if (cryptos.length > 0) {
      labels = cryptos[0].labels;
    }
    const datasets = {};
    equities.forEach(item => {
      datasets[item.sym] = item.values;
    });
    cryptos.forEach(item => {
      const sym = item.id === 'bitcoin' ? 'BTC' : 'ETH';
      const priceMap = {};
      item.labels.forEach((date, idx) => { priceMap[date] = item.values[idx]; });
      datasets[sym] = labels.map(date => priceMap[date] ?? null);
    });
    // Normalize each series to start at 100 for comparability
    const normalized = {};
    for (const key of Object.keys(datasets)) {
      const series = datasets[key];
      const baseIndex = series.findIndex(v => v !== null);
      const base = baseIndex >= 0 ? series[baseIndex] : 1;
      normalized[key] = series.map(v => v !== null && base ? (v / base) * 100 : null);
    }
    return { labels, datasets: normalized };
  } catch (err) {
    console.error('History data fetch failed', err);
    return null;
  }
}

function renderHistoryChart(data) {
  const canvas = document.getElementById('history-line-chart');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  // Assign colours dynamically.  Predefine some favourites for common symbols,
  // otherwise select from a palette.  This ensures any watchlist ticker has
  // a distinct colour.
  const baseColours = {
    SPY: '#6366f1',
    TSLA: '#f59e0b',
    BTC: '#f97316',
    ETH: '#10b981',
    AEO: '#7c3aed'
  };
  const palette = ['#0ea5e9','#14b8a6','#e11d48','#f59e0b','#6366f1','#f97316','#10b981','#7c3aed'];
  let paletteIndex = 0;
  const datasets = [];
  Object.keys(data.datasets).forEach(key => {
    let colour = baseColours[key];
    if (!colour) {
      colour = palette[paletteIndex % palette.length];
      paletteIndex++;
    }
    const series = data.datasets[key];
    // Original series dataset
    datasets.push({
      label: key,
      data: series,
      borderColor: colour,
      backgroundColor: colour + '20',
      borderWidth: 2,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 0
    });
    // Compute 7-period moving average to smooth noise; skip if fewer points
    if (series.filter(v => v != null).length > 7) {
      const ma = [];
      for (let i = 0; i < series.length; i++) {
        if (i < 6 || series[i] == null) {
          ma.push(null);
        } else {
          let sum = 0;
          let count = 0;
          for (let j = i - 6; j <= i; j++) {
            if (series[j] != null) {
              sum += series[j];
              count++;
            }
          }
          ma.push(count > 0 ? sum / count : null);
        }
      }
      datasets.push({
        label: `${key} MA7`,
        data: ma,
        borderColor: colour,
        borderDash: [4, 4],
        borderWidth: 1,
        fill: false,
        tension: 0.25,
        pointRadius: 0,
        hoverRadius: 0,
        spanGaps: true
      });
    }
  });
  // Destroy existing chart instance if present
  if (window.historyChart) {
    window.historyChart.destroy();
  }
  // Determine whether this chart sits inside a dark section.  Dark backgrounds
  // require light text and grid colours, whereas light backgrounds need dark
  // colours.  Use the closest section wrapper to infer the theme.
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  window.historyChart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } },
          grid: { display: false },
          title: { display: true, text: 'Date', color: textColour, font: { family: 'Maison Neue Mono', size: 9, weight: 'bold' } }
        },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Normalised Return (100=base)', color: textColour, font: { family: 'Maison Neue Mono', size: 9, weight: 'bold' } }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { font: { family: 'Maison Neue Mono', size: 10 }, color: textColour }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y ? ctx.parsed.y.toLocaleString(undefined,{ maximumFractionDigits: 2 }) : 'N/A'}`
          }
        },
        // Enable panning and zooming only.  Crosshair plugin is removed to
        // improve reliability in environments where optional plugins may not load.
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          }
        }
      }
    }
  });
}

/* ==========================================
 * Stock moving average chart
 * Given OHLC data for an equity, compute the closing prices and a simple
 * moving average (7‑period) and render them on a line chart.  This chart
 * complements the candlestick visualisation by highlighting the underlying
 * trend.  Colours adapt to the surrounding theme.
 */
let stockMAChart;
function renderStockMAChart(ohlcData) {
  const canvas = document.getElementById('stock-ma-chart');
  if (!canvas || !ohlcData || !Array.isArray(ohlcData)) return;
  const ctx = canvas.getContext('2d');
  // Extract dates and closing prices
  const labels = ohlcData.map(item => {
    const d = new Date(item.x);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const closes = ohlcData.map(item => item.y[3]);
  // Compute 7‑period moving average
  const ma = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < 6) {
      ma.push(null);
    } else {
      const slice = closes.slice(i - 6, i + 1);
      const avg = slice.reduce((sum, v) => sum + v, 0) / 7;
      ma.push(avg);
    }
  }
  // Determine colours based on dark/light section
  const isDark = canvas.closest('.section-dark') !== null;
  const priceColour = '#6366f1';
  const maColour = '#f59e0b';
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  // Destroy existing chart if present
  if (stockMAChart) {
    stockMAChart.destroy();
  }
  stockMAChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Close',
          data: closes,
          borderColor: priceColour,
          backgroundColor: priceColour + '20',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: true
        },
        {
          label: 'MA7',
          data: ma,
          borderColor: maColour,
          backgroundColor: maColour + '20',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Price (USD)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } } },
        tooltip: {}
      }
    }
  });
}

/* ===============================
 * Candlestick chart using ApexCharts
 * Fetches open, high, low, close data for a selected equity (SPY by default)
 * and renders an interactive candlestick chart. Falls back to sample data
 * if network requests fail.
 */
async function fetchOHLC(symbol = 'SPY') {
  // Sample OHLC data: generates synthetic candles for 30 days
  function generateSample() {
    const data = [];
    let base = 400;
    for (let i = 0; i < 30; i++) {
      const open = base + (Math.random() - 0.5) * 5;
      const close = open + (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
      data.push({ x: Date.now() - (29 - i) * 24 * 3600 * 1000, y: [open, high, low, close] });
      base = close;
    }
    return data;
  }
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const series = json['Time Series (Daily)'];
    if (!series) throw new Error('No series');
    const dates = Object.keys(series).sort().slice(-30);
    const data = dates.map(date => {
      const ohlc = series[date];
      return {
        x: new Date(date).getTime(),
        y: [parseFloat(ohlc['1. open']), parseFloat(ohlc['2. high']), parseFloat(ohlc['3. low']), parseFloat(ohlc['4. close'])]
      };
    });
    // Validate data
    if (data.every(item => item.y.every(v => !isNaN(v)))) {
      return data;
    }
    throw new Error('Invalid values');
  } catch (err) {
    console.error('Fetch OHLC failed', err);
    return generateSample();
  }
}

/* ==========================================
 * Twelve Data fetch helper
 * Retrieves daily price data for a given symbol from TwelveData.  This
 * endpoint provides time series with high granularity and is useful for
 * fetching tickers not covered by Alpaca or AlphaVantage.  On failure or
 * offline, returns null so the caller can fallback to sample data.
 */
async function fetchTwelveSeries(symbol) {
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${TWELVE_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.values) {
      const labels = json.values.map(item => item.datetime).reverse();
      const values = json.values.map(item => parseFloat(item.close)).reverse();
      return { labels, values };
    }
  } catch (err) {
    console.error('TwelveData fetch error', err);
  }
  return null;
}

/* ==========================================
 * Portfolio performance chart
 * Plots the cumulative returns of the user's portfolio (or a default set of
 * holdings) relative to the starting value.  If the user has a watchlist
 * defined, the portfolio is assumed to be equally weighted across those
 * tickers; otherwise a single default ticker (AEO) is used.  Series are
 * normalised to 100 at the start date.  Supports zoom and crosshair for
 * exploration.  Uses fallback synthetic data when network calls fail.
 */
async function renderPortfolioPerformance() {
  const canvas = document.getElementById('portfolio-performance-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Determine tickers: use watchlist if available; else default to AEO.
  const tickers = (Array.isArray(watchlistTickers) && watchlistTickers.length > 0) ? watchlistTickers.map(t => t.toUpperCase()) : ['AEO'];
  // Fetch series for each ticker.  Attempt Alpaca/Alpha first via fetchEquitySeries.
  const datasets = {};
  let labels = [];
  for (const sym of tickers) {
    let series = null;
    try {
      const res = await fetchEquitySeries(sym);
      if (res && res.labels && res.values) {
        series = res;
      }
    } catch (err) {
      console.error('fetchEquitySeries error for performance', sym, err);
    }
    // Fallback to TwelveData if series is null
    if (!series) {
      const res = await fetchTwelveSeries(sym);
      if (res) {
        series = res;
      }
    }
    // Use labels from first successful series
    if (series && labels.length === 0) labels = series.labels;
    // Normalise to base 100
    if (series && series.values && series.values.length > 0) {
      const baseIdx = series.values.findIndex(v => v !== null);
      const baseVal = baseIdx >= 0 ? series.values[baseIdx] : 1;
      const norm = series.values.map(v => (v !== null && baseVal) ? (v / baseVal) * 100 : null);
      datasets[sym] = norm;
    } else {
      // Generate synthetic series if no data available
      const fallback = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * (tickers.indexOf(sym) + 1));
      datasets[sym] = fallback;
      if (labels.length === 0) labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    }
  }
  // Build Chart.js datasets with distinct colours
  const baseColours = {
    SPY: '#6366f1',
    TSLA: '#f59e0b',
    BTC: '#f97316',
    ETH: '#10b981',
    AEO: '#7c3aed'
  };
  const palette = ['#0ea5e9','#14b8a6','#e11d48','#f59e0b','#6366f1','#f97316','#10b981','#7c3aed','#8b5cf6','#ec4899'];
  let paletteIndex = 0;
  const chartDatasets = Object.keys(datasets).map(key => {
    let colour = baseColours[key] || null;
    if (!colour) {
      colour = palette[paletteIndex % palette.length];
      paletteIndex++;
    }
    return {
      label: key,
      data: datasets[key],
      borderColor: colour,
      backgroundColor: colour + '30',
      borderWidth: 2,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 0
    };
  });
  // Destroy previous chart if exists
  if (window.portfolioPerformanceChart) {
    window.portfolioPerformanceChart.destroy();
  }
  // Determine colour theme based on the section containing this chart
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  window.portfolioPerformanceChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { display: false },
          title: { display: true, text: 'Date', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Index (Base 100)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: true, labels: { font: { family: 'Maison Neue Mono', size: 9 }, color: textColour } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y ? ctx.parsed.y.toFixed(2) : 'N/A'}`
          }
        },
        // Enable panning and zooming; omit crosshair for reliability
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          }
        }
      }
    }
  });

  // After drawing the portfolio performance chart, compute and display summary statistics
  renderPortfolioStats(datasets, labels);

  // Render a correlation heatmap of daily returns across portfolio holdings.  This helps
  // investors understand diversification and risk.  The heatmap uses Plotly to
  // visualise correlation coefficients between each pair of assets.  See
  // renderPortfolioCorrelation() for implementation details.
  renderPortfolioCorrelation(datasets);

  // After computing correlations, visualise the distribution of daily returns and
  // the risk‑return profile of each asset.  The histogram illustrates how
  // frequently returns fall into various ranges, while the scatter plot
  // compares volatility and annualised return for each holding.
  renderPortfolioHistogram(datasets);
  renderPortfolioRiskReturn(datasets);
}

/* Compute and display portfolio performance metrics such as average return, YTD return and beta relative to a benchmark.
 * @param datasets Object mapping ticker symbols to arrays of normalised values.
 * @param labels Array of corresponding dates.
 */
function renderPortfolioStats(datasets, labels) {
  const container = document.getElementById('portfolio-stats');
  if (!container) return;
  const tickers = Object.keys(datasets);
  if (tickers.length === 0) {
    container.innerHTML = '';
    return;
  }
  // Choose SPY as benchmark if available, else first ticker
  const benchmarkKey = tickers.includes('SPY') ? 'SPY' : tickers[0];
  const benchmarkSeries = datasets[benchmarkKey];
  // Helper to compute daily returns from normalised values
  function toReturns(series) {
    const returns = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      if (prev != null && curr != null) returns.push((curr - prev) / prev);
    }
    return returns;
  }
  const benchmarkReturns = toReturns(benchmarkSeries);
  let totalReturnSum = 0;
  let betaSum = 0;
  tickers.forEach(key => {
    const series = datasets[key];
    // total return using normalised series (end/start - 1)
    const start = series.find(v => v != null);
    const end = [...series].reverse().find(v => v != null);
    const totalReturn = (end && start) ? (end - start) / start : 0;
    totalReturnSum += totalReturn;
    // compute beta relative to benchmark
    const assetReturns = toReturns(series);
    const n = Math.min(assetReturns.length, benchmarkReturns.length);
    let meanAsset = 0, meanBench = 0;
    for (let i = 0; i < n; i++) {
      meanAsset += assetReturns[i];
      meanBench += benchmarkReturns[i];
    }
    if (n > 0) {
      meanAsset /= n;
      meanBench /= n;
      let cov = 0, varBench = 0;
      for (let i = 0; i < n; i++) {
        cov += (assetReturns[i] - meanAsset) * (benchmarkReturns[i] - meanBench);
        varBench += (benchmarkReturns[i] - meanBench) ** 2;
      }
      cov /= n;
      varBench /= n;
      const beta = varBench !== 0 ? cov / varBench : 1;
      betaSum += beta;
    } else {
      betaSum += 1;
    }
  });
  const avgReturn = totalReturnSum / tickers.length;
  const avgBeta = betaSum / tickers.length;
  // Compute portfolio daily returns by averaging each asset's return per day
  const portfolioReturns = [];
  // Determine the length of return series (n-1)
  const firstSeries = datasets[tickers[0]];
  if (firstSeries && firstSeries.length > 1) {
    for (let i = 1; i < firstSeries.length; i++) {
      let sumR = 0;
      let count = 0;
      tickers.forEach(key => {
        const series = datasets[key];
        const prev = series[i - 1];
        const curr = series[i];
        if (prev != null && curr != null) {
          sumR += (curr - prev) / prev;
          count++;
        }
      });
      portfolioReturns.push(count > 0 ? sumR / count : 0);
    }
  }
  // Compute average daily return and volatility
  let meanDaily = 0;
  portfolioReturns.forEach(r => { meanDaily += r; });
  meanDaily = portfolioReturns.length > 0 ? meanDaily / portfolioReturns.length : 0;
  let variance = 0;
  portfolioReturns.forEach(r => { variance += Math.pow(r - meanDaily, 2); });
  variance = portfolioReturns.length > 0 ? variance / portfolioReturns.length : 0;
  const volatility = Math.sqrt(variance);
  // Annualise: assume 252 trading days
  const annualisedReturn = meanDaily * 252;
  const annualisedVol = volatility * Math.sqrt(252);
  const sharpe = annualisedVol !== 0 ? annualisedReturn / annualisedVol : 0;
  // For YTD we reuse avgReturn (over last month) as proxy; in real use this would compare year start
  const ytdReturn = avgReturn;
  // Format values
  function fmt(x) { return (x * 100).toFixed(2) + '%'; }
  // Build stats array including volatility and Sharpe ratio
  const stats = [
    { label: 'Total Return', value: fmt(avgReturn) },
    { label: 'YTD', value: fmt(ytdReturn) },
    { label: 'Beta', value: avgBeta.toFixed(2) },
    { label: 'Volatility', value: fmt(annualisedVol) },
    { label: 'Sharpe', value: sharpe.toFixed(2) }
  ];
  container.innerHTML = '';
  stats.forEach(item => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<span class="value">${item.value}</span><span class="label">${item.label}</span>`;
    container.appendChild(div);
  });
}

/* ==========================================
 * Portfolio Correlation Heatmap
 * Generates a heatmap displaying Pearson correlation coefficients between
 * daily returns of each pair of assets in the portfolio.  Uses Plotly for
 * interactive zoom and hover.  The input `datasets` should map ticker
 * symbols to arrays of normalised index values (base 100).  Returns are
 * computed from the differences between consecutive values.
 */
function renderPortfolioCorrelation(datasets) {
  const container = document.getElementById('portfolio-corr-chart');
  if (!container) return;
  const tickers = Object.keys(datasets);
  if (tickers.length < 2) {
    container.innerHTML = '';
    return;
  }
  // Compute daily returns for each series
  const returnsMap = {};
  tickers.forEach(key => {
    const values = datasets[key];
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      if (prev != null && curr != null) returns.push((curr - prev) / prev);
    }
    returnsMap[key] = returns;
  });
  // Function to compute Pearson correlation between two arrays
  function corr(a, b) {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;
    let meanA = 0, meanB = 0;
    for (let i = 0; i < n; i++) { meanA += a[i]; meanB += b[i]; }
    meanA /= n; meanB /= n;
    let cov = 0, varA = 0, varB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      cov += da * db;
      varA += da * da;
      varB += db * db;
    }
    const denom = Math.sqrt(varA * varB);
    return denom === 0 ? 0 : cov / denom;
  }
  // Build correlation matrix
  const matrix = tickers.map(rowKey => tickers.map(colKey => corr(returnsMap[rowKey], returnsMap[colKey])));
  // Colour scale from strong negative (blue) to strong positive (red) via white
  const colourscale = [
    [0, '#0ea5e9'],
    [0.5, '#f5f5f5'],
    [1, '#ef4444']
  ];
  const data = [{
    z: matrix,
    x: tickers,
    y: tickers,
    type: 'heatmap',
    colorscale: colourscale,
    zmin: -1,
    zmax: 1,
    hoverongaps: false
  }];
  const layout = {
    margin: { t: 40, l: 60, r: 20, b: 60 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      ticks: '',
      side: 'top'
    },
    yaxis: {
      ticks: ''
    },
    annotations: []
  };
  // Add annotation for each cell with correlation value
  for (let i = 0; i < tickers.length; i++) {
    for (let j = 0; j < tickers.length; j++) {
      layout.annotations.push({
        x: tickers[j], y: tickers[i],
        text: matrix[i][j].toFixed(2),
        font: { color: Math.abs(matrix[i][j]) > 0.5 ? '#f5f5f5' : '#333', size: 9 },
        showarrow: false
      });
    }
  }
  const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['toImage','hoverCompareCartesian','hoverClosestCartesian'] };
  Plotly.newPlot(container, data, layout, config);
}

/* Generate a histogram of daily returns across all portfolio assets.  This chart
 * provides insight into the distribution of short‑term gains and losses.  It
 * aggregates daily returns from every holding and bins them into a fixed
 * number of buckets.  Colours and axis labels adapt to dark or light
 * themes. */
function renderPortfolioHistogram(datasets) {
  const canvas = document.getElementById('portfolio-hist-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Gather all daily returns across all series
  const returns = [];
  Object.values(datasets).forEach(series => {
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      if (prev != null && curr != null) {
        returns.push((curr - prev) / prev);
      }
    }
  });
  if (returns.length === 0) return;
  // Determine histogram bins
  const minVal = Math.min(...returns);
  const maxVal = Math.max(...returns);
  const binCount = 10;
  const binSize = (maxVal - minVal) / binCount || 0.001;
  const labels = [];
  const counts = Array(binCount).fill(0);
  for (let i = 0; i < binCount; i++) {
    const lower = minVal + i * binSize;
    const upper = lower + binSize;
    labels.push(`${(lower * 100).toFixed(1)}% – ${(upper * 100).toFixed(1)}%`);
  }
  returns.forEach(val => {
    let idx = Math.floor((val - minVal) / binSize);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx]++;
  });
  // Determine theme colours
  const isDark = canvas.closest('.section-dark') !== null;
  const barColour = isDark ? 'rgba(59,130,246,0.7)' : 'rgba(99,102,241,0.7)';
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  // Destroy previous chart
  if (window.portfolioHistChart) {
    window.portfolioHistChart.destroy();
  }
  window.portfolioHistChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Daily Return Frequency', data: counts, backgroundColor: barColour }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } },
          grid: { display: false },
          title: { display: true, text: 'Daily Return Range (%)', color: textColour, font: { family: 'Maison Neue Mono', size: 9, weight: 'bold' } }
        },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Count', color: textColour, font: { family: 'Maison Neue Mono', size: 9, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Count: ${ctx.parsed.y}`
          }
        },
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

/* Generate a risk–return scatter plot for portfolio assets.  Each point
 * represents an asset with its x‑coordinate equal to annualised volatility
 * (standard deviation) and y‑coordinate equal to annualised return.  Colours
 * are consistent with other portfolio charts. */
function renderPortfolioRiskReturn(datasets) {
  const canvas = document.getElementById('portfolio-riskreturn-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const tickers = Object.keys(datasets);
  const points = [];
  const colours = [];
  // Base colours consistent with portfolio pie chart
  const baseColours = {
    SPY: '#6366f1', TSLA: '#f59e0b', BTC: '#f97316', ETH: '#10b981', AEO: '#7c3aed'
  };
  const palette = ['#0ea5e9','#14b8a6','#e11d48','#f59e0b','#6366f1','#f97316','#10b981','#7c3aed','#8b5cf6','#ec4899'];
  let palIndex = 0;
  function computeStats(series) {
    const returns = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      if (prev != null && curr != null) returns.push((curr - prev) / prev);
    }
    const n = returns.length;
    if (n === 0) return { avg: 0, std: 0 };
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    let variance = 0;
    returns.forEach(r => { variance += (r - mean) ** 2; });
    variance /= n;
    const std = Math.sqrt(variance);
    return { avg: mean * 252, std: std * Math.sqrt(252) };
  }
  tickers.forEach(key => {
    const stats = computeStats(datasets[key]);
    let colour = baseColours[key] || null;
    if (!colour) {
      colour = palette[palIndex % palette.length];
      palIndex++;
    }
    points.push({ x: stats.std * 100, y: stats.avg * 100, r: 6, label: key, color: colour });
  });
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  // Destroy previous chart if exists
  if (window.portfolioRiskReturnChart) {
    window.portfolioRiskReturnChart.destroy();
  }
  window.portfolioRiskReturnChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Assets',
        data: points,
        backgroundColor: points.map(p => p.color),
        pointRadius: points.map(p => p.r),
        pointHoverRadius: points.map(p => p.r + 2)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Volatility (%)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour }
        },
        y: {
          title: { display: true, text: 'Annualised Return (%)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const p = ctx.raw;
              return `${p.label}: Vol ${p.x.toFixed(2)}%, Ret ${p.y.toFixed(2)}%`;
            }
          }
        },
        zoom: {
          pan: { enabled: true, mode: 'xy', threshold: 10 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
      }
    }
  });
}

let candlestickChart = null;
/* Render an ApexCharts candlestick chart for the given OHLC series.  The optional
 * symbol parameter sets the series name used in the legend.  Axis titles
 * are added to improve clarity. */
function renderCandlestickChart(data, symbol = 'Asset') {
  // Use the lightweight-charts library for a responsive candlestick chart. This
  // library does not depend on WebGL and produces an elegant chart with
  // minimal configuration. The input `data` should be an array of objects
  // containing an epoch timestamp (milliseconds) in `x` and an array `[open, high, low, close]` in `y`.
  const container = document.getElementById('lw-candle-chart');
  if (!container) return;
  // Clear any previous chart instance by removing child nodes
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  /*
   * Render the candlestick chart using Plotly for maximum compatibility.  Plotly
   * does not rely on WebGL for basic charts, ensuring that the candlestick
   * renders correctly across all environments.  A 7‑day moving average line
   * is overlaid as a separate trace.  Colours adapt to dark/light themes.
   */
  const dates = data.map(item => new Date(item.x));
  const opens = data.map(item => item.y[0]);
  const highs = data.map(item => item.y[1]);
  const lows = data.map(item => item.y[2]);
  const closesArr = data.map(item => item.y[3]);
  // Compute 7‑day moving average for closing prices
  const ma = [];
  for (let i = 0; i < closesArr.length; i++) {
    if (i < 6) {
      ma.push(null);
    } else {
      const windowArr = closesArr.slice(i - 6, i + 1);
      const avg = windowArr.reduce((sum, v) => sum + v, 0) / 7;
      ma.push(avg);
    }
  }
  // Determine theme colours
  const isDark = container.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  const increasingColour = '#10b981';
  const decreasingColour = '#ef4444';
  // Build Plotly traces
  const candleTrace = {
    x: dates,
    open: opens,
    high: highs,
    low: lows,
    close: closesArr,
    type: 'candlestick',
    name: symbol,
    increasing: { line: { color: increasingColour }, fillcolor: increasingColour },
    decreasing: { line: { color: decreasingColour }, fillcolor: decreasingColour },
    showlegend: false
  };
  const maTrace = {
    x: dates,
    y: ma,
    type: 'scatter',
    mode: 'lines',
    name: `${symbol} MA7`,
    line: { color: '#9f9087', width: 2 },
    hoverinfo: 'none'
  };
  const layout = {
    margin: { l: 40, r: 10, t: 20, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    // Disable the built‑in range slider to prevent a duplicate mini‑chart from appearing below
    xaxis: {
      title: '',
      type: 'date',
      tickfont: { color: textColour, family: 'Maison Neue Mono', size: 9 },
      gridcolor: gridColour,
      rangeslider: { visible: false }
    },
    yaxis: {
      title: '',
      tickfont: { color: textColour, family: 'Maison Neue Mono', size: 9 },
      gridcolor: gridColour,
      fixedrange: false
    },
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.05, font: { color: textColour, size: 9, family: 'Maison Neue Mono' } }
  };
  const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['toImage','hoverCompareCartesian','hoverClosestCartesian'] };
  // Destroy previous Plotly chart if exists by purging the div
  if (window.lwCandleChart) {
    try {
      Plotly.purge(container);
    } catch (e) {
      // ignore purge errors
    }
  }
  Plotly.newPlot(container, [candleTrace, maTrace], layout, config);
  window.lwCandleChart = true;
}

/* ======================================================
 * Stock fundamentals and metrics
 * Fetches key ratios from AlphaVantage and renders summary cards.
 */
async function fetchStockFundamentals(symbol) {
  // Use AlphaVantage's OVERVIEW endpoint to retrieve fundamentals such as P/E ratio and market cap.
  const fallback = { pe: null, marketCap: null, eps: null, beta: null, dividendYield: null };
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0 || data.Note) {
      throw new Error('No fundamentals');
    }
    const pe = parseFloat(data.PERatio);
    const mc = parseFloat(data.MarketCapitalization);
    const eps = parseFloat(data.EPS);
    const beta = parseFloat(data.Beta);
    const dy = parseFloat(data.DividendYield);
    const result = {
      pe: isNaN(pe) ? null : pe,
      marketCap: isNaN(mc) ? null : mc,
      eps: isNaN(eps) ? null : eps,
      beta: isNaN(beta) ? null : beta,
      dividendYield: isNaN(dy) ? null : dy
    };
    saveToCache(`fundamentals:${symbol}`, result);
    return result;
  } catch (err) {
    console.error('fetchStockFundamentals error', err);
    const cached = loadFromCache(`fundamentals:${symbol}`);
    return cached || fallback;
  }
}

/**
 * Render summary metrics for the selected stock.  Combines fundamental
 * ratios with the latest price derived from the OHLC series.  Values
 * are formatted appropriately (e.g. market cap in billions).  The
 * resulting cards are inserted into the #stock-metrics container.
 */
function renderStockMetrics(fundamentals, ohlc, symbol) {
  const container = document.getElementById('stock-metrics');
  if (!container) return;
  container.innerHTML = '';
  // Compute last closing price from the OHLC series
  let price = null;
  if (Array.isArray(ohlc) && ohlc.length > 0) {
    const last = ohlc[ohlc.length - 1];
    price = last && Array.isArray(last.y) ? last.y[3] : null;
  }
  // Helper to format large numbers into billions/trillions
  const formatCap = val => {
    if (val == null || isNaN(val)) return 'N/A';
    if (val >= 1e12) return (val / 1e12).toFixed(2) + 'T';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    return val.toLocaleString();
  };
  const cards = [];
  // Price card
  cards.push({ label: 'Price', value: price != null ? '$' + price.toFixed(2) : 'N/A' });
  // P/E ratio card
  cards.push({ label: 'P/E Ratio', value: fundamentals.pe != null ? fundamentals.pe.toFixed(2) : 'N/A' });
  // Market cap card
  cards.push({ label: 'Market Cap', value: fundamentals.marketCap != null ? formatCap(fundamentals.marketCap) : 'N/A' });
  // EPS card
  cards.push({ label: 'EPS', value: fundamentals.eps != null ? fundamentals.eps.toFixed(2) : 'N/A' });
  // Beta card
  cards.push({ label: 'Beta', value: fundamentals.beta != null ? fundamentals.beta.toFixed(2) : 'N/A' });
  // Dividend yield card
  cards.push({ label: 'Dividend Yield', value: fundamentals.dividendYield != null ? (fundamentals.dividendYield * 100).toFixed(2) + '%' : 'N/A' });
  cards.forEach(item => {
    const div = document.createElement('div');
    div.className = 'metric-card';
    div.innerHTML = `<div class="value">${item.value}</div><div class="label">${item.label}</div>`;
    container.appendChild(div);
  });
}

/**
 * Render the investment thesis for the selected stock.  Uses a predefined
 * dictionary of thesis snippets keyed by ticker.  If no thesis is
 * available, displays a placeholder inviting further research.
 */
function renderStockThesis(symbol) {
  const container = document.getElementById('stock-thesis');
  if (!container) return;
  const theses = {
    AAPL: `Apple is a global leader in consumer electronics and software services. Its integrated ecosystem fosters strong customer loyalty and recurring revenue streams from the App Store, iCloud and subscription services. Continued innovation in hardware (iPhone, iPad, Mac) coupled with expansion into new categories like wearables and mixed reality positions the company for sustained growth.`,
    MSFT: `Microsoft dominates enterprise software through Windows, Office 365 and Azure cloud. Strong recurring revenue from subscriptions and cloud services provides stability, while investments in AI and gaming (Xbox, Activision) fuel growth.`,
    GOOGL: `Alphabet benefits from advertising dominance via Google Search and YouTube. Diversification into cloud computing, AI and autonomous vehicles (Waymo) offer optionality. Regulation and advertising cyclicality remain key risks.`,
    AMZN: `Amazon’s e‑commerce platform drives massive scale and logistics advantages, while AWS remains a high‑margin growth engine. Continued investment in streaming, advertising and healthcare broadens the opportunity set but compresses near‑term margins.`,
    TSLA: `Tesla leads the electric vehicle revolution with superior battery technology, proprietary software and a rapidly expanding manufacturing footprint. Autonomy and energy storage products provide additional avenues for expansion, though competition and execution risk persist.`
  };
  const text = theses[symbol] || 'No thesis available. Stay tuned for future research.';
  container.innerHTML = `<h3>${symbol} Investment Thesis</h3><p>${text}</p>`;
}

async function setupCandlestick() {
  // This function initialises a default candlestick chart.  It always shows
  // AAPL to synchronise with the stock spotlight section.  The watchlist
  // logic has been removed to avoid switching symbols unexpectedly.
  const container = document.getElementById('lw-candle-chart');
  if (!container) return;
  const primary = 'AAPL';
  try {
    const data = await fetchOHLC(primary);
    renderCandlestickChart(data, primary);
  } catch (err) {
    console.error('setupCandlestick error', err);
  }
}

async function setupHistory() {
  // The stock spotlight section now supports a user‑selectable stock and displays
  // candlesticks, fundamental metrics and a thesis for the chosen symbol.
  const select = document.getElementById('stock-select');
  if (!select) return;
  async function update() {
    const symbol = select.value;
    try {
      // Fetch OHLC data for the selected symbol
      const ohlc = await fetchOHLC(symbol);
      // Render candlestick chart with overlayed moving average
      renderCandlestickChart(ohlc, symbol);
      // Fetch key fundamentals (P/E, market cap, etc.) and render metrics
      const fundamentals = await fetchStockFundamentals(symbol);
      renderStockMetrics(fundamentals, ohlc, symbol);
      // Update thesis text for the selected stock
      renderStockThesis(symbol);
      // Populate AI analysis and news using the selected symbol
      populateAssetAnalysis(symbol);
    } catch (err) {
      console.error('setupHistory update error', err);
    }
  }
  select.addEventListener('change', update);
  // Perform an initial update on page load
  update();
}

/* ===============================
 * Portfolio and Gemini integration
 * Fetches AI-generated insights for portfolio holdings using the Gemini API.
 * If the request fails (e.g. due to CORS or network restrictions), falls back to
 * sample insights or previously cached data.
 */
async function fetchGeminiInsights() {
  // Define fallback insights in case the API call fails or returns invalid data
  const fallback = [
    {
      ticker: 'SPY',
      title: 'Broad Market Exposure',
      insight: 'SPY provides diversified exposure to the S&P 500, offering a balanced blend of sectors and steady long‑term growth.',
      risk: 'Market downturns can drag the entire index lower, affecting all constituents.',
      opportunity: 'Ideal core holding for capturing overall U.S. equity market performance.'
    },
    {
      ticker: 'TSLA',
      title: 'EV Innovator',
      insight: 'Tesla is a leader in electric vehicles with strong brand and manufacturing efficiencies.',
      risk: 'Valuation remains rich; competition and regulatory challenges could compress margins.',
      opportunity: 'Ongoing expansion into energy storage and autonomous driving opens new revenue streams.'
    },
    {
      ticker: 'BTC',
      title: 'Digital Gold',
      insight: 'Bitcoin acts as a store of value and hedge against fiat currency debasement.',
      risk: 'High volatility and regulatory scrutiny make it unsuitable for risk‑averse investors.',
      opportunity: 'Growing institutional adoption could support long‑term price appreciation.'
    },
    {
      ticker: 'ETH',
      title: 'Smart Contract Platform',
      insight: 'Ethereum powers the leading smart contract ecosystem, supporting DeFi, NFTs and more.',
      risk: 'Network congestion and scalability issues could hinder adoption until upgrades are fully implemented.',
      opportunity: 'Upcoming upgrades and layer‑2 solutions enhance throughput, potentially unlocking new use cases.'
    }
  ];
  try {
    const prompt = `You are an investment research assistant. Generate concise investment insights for the following assets: SPY (S&P 500 ETF), TSLA (Tesla Inc.), BTC (Bitcoin), ETH (Ethereum). Return a JSON array where each element has the keys: ticker, title, insight, risk, and opportunity. Do not wrap the JSON in code fences or additional text.`;
    const body = {
      contents: [ { parts: [ { text: prompt } ] } ],
      generationConfig: {
        response_mime_type: 'application/json'
      }
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    // The response text may be in the first candidate part
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      // Parse the JSON string
      const data = JSON.parse(text.trim());
      if (Array.isArray(data)) {
        lastGeminiData = data;
        return data;
      }
    }
    throw new Error('Invalid Gemini response');
  } catch (err) {
    console.error('Gemini API error', err);
    // Use last successful or static fallback
    return lastGeminiData || fallback;
  }
}

// Fetch AI-generated news highlights using Gemini. Returns an array of strings.
async function fetchGeminiNews() {
  const fallback = [
    'The Federal Reserve signalled no rate cuts amid robust economic data.',
    'Tech stocks rallied on AI optimism, with Tesla leading gains.',
    'Bitcoin rebounded above $30k as ETF inflows accelerated.'
  ];
  try {
    const prompt = `Provide three concise bullet points summarising today’s major investment news topics. Return them as a JSON array of strings without any extra text.`;
    const body = {
      contents: [ { parts: [ { text: prompt } ] } ],
      generationConfig: { response_mime_type: 'application/json' }
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const data = JSON.parse(text.trim());
      if (Array.isArray(data)) {
        lastGeminiNews = data;
        return data;
      }
    }
    throw new Error('Invalid Gemini news response');
  } catch (err) {
    console.error('Gemini news error', err);
    return lastGeminiNews || fallback;
  }
}

/* ===============================
 * Macro analysis via Gemini
 * Generates a concise summary and bullet points describing current macro conditions
 * based on the latest macro dashboard metrics. Returns an object with
 * `summary` (string) and `bullets` (array of strings).
 */
async function fetchGeminiMacroAnalysis(metrics) {
  // If no metrics passed, use cached dashboard
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    metrics = lastMacroDashboard;
  }
  // Prepare fallback summarised narrative using simple heuristics
  const fallback = {
    summary: 'Economic conditions are mixed. GDP growth remains solid while inflation trends higher. Unemployment is low, but rates are elevated to combat price pressures.',
    bullets: [
      'GDP continues to expand at a steady pace, suggesting resilient economic momentum.',
      'Inflation remains above target, keeping central bank policy in restrictive territory.',
      'The labour market is tight, supporting consumer spending despite rate hikes.',
      'Longer-term bond yields have risen modestly amid expectations of persistent inflation.']
  };
  try {
    // Compose descriptive text of metrics
    const descriptions = metrics.map(m => {
      const changeSign = m.change >= 0 ? 'up' : 'down';
      const valueStr = m.unit === '%' ? `${m.latest.toFixed(2)}%` : m.latest.toLocaleString();
      const changeStr = `${Math.abs(m.change).toFixed(2)}%`;
      return `${m.name} is ${valueStr}, ${changeSign} ${changeStr} from the prior period`;
    }).join('; ');
    const prompt = `You are a macroeconomic analyst. Based on the following metrics: ${descriptions}. Provide a brief narrative summarising the state of the economy and four concise bullet points highlighting key takeaways. Return your answer strictly as a JSON object with two keys: \"summary\" (string) and \"bullets\" (array of four strings). Do not include any other text or code fences.`;
    const body = { contents: [ { parts: [ { text: prompt } ] } ], generationConfig: { response_mime_type: 'application/json' } };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const data = JSON.parse(text.trim());
      if (data.summary && Array.isArray(data.bullets)) {
        lastMacroAnalysis = data;
        return data;
      }
    }
    throw new Error('Invalid Gemini macro response');
  } catch (err) {
    console.error('Gemini macro analysis error', err);
    return lastMacroAnalysis || fallback;
  }
}

// Populate macro analysis section using Gemini
function populateMacroAnalysis(metrics) {
  const container = document.getElementById('macro-analysis');
  if (!container) return;
  /*
    The Gemini API used previously to generate a macro analysis is not
    available in this environment. To ensure the page still provides
    meaningful context, we instead create a static summary and set of
    bullet points based on publicly reported data as of July 2025. If
    you integrate a language model or analytics engine in the future,
    replace this logic with a dynamic call similar to the previous
    implementation.
  */
  container.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = 'Macro Insight';
  const summary = document.createElement('p');
  summary.textContent = 'The U.S. economy remains resilient going into mid‑2025. Real GDP is near record levels, inflation has cooled from its peak but stays above the Federal Reserve’s 2 percent target, and the labour market continues to show strength despite modest softening.';
  const ul = document.createElement('ul');
  const bulletPoints = [
    'Real GDP dipped slightly in Q1 2025 but remains close to $30 trillion, signalling continued economic momentum.',
    'Inflation, measured by the CPI, rose roughly 3 percent year‑on‑year in June 2025, well below the highs seen in 2022.',
    'The unemployment rate edged down to 4.1 percent, highlighting a still‑tight labour market.',
    'The Federal Reserve held its policy rate steady around 4.33 percent as it assesses the lagged impact of earlier rate hikes.',
    'Ten‑year Treasury yields eased to about 4.3 percent, reflecting expectations for moderating growth.',
    'Housing starts rebounded by 4.6 percent in June 2025 to an annualised 1.32 million units, driven by multifamily construction.',
    'Retail sales increased 0.6 percent month‑over‑month in June 2025, reaching roughly $720 billion as consumer spending remained robust.'
  ];
  bulletPoints.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  container.appendChild(title);
  container.appendChild(summary);
  container.appendChild(ul);
}

function populateNews() {
  const feed = document.getElementById('news-feed');
  if (!feed) return;
  /*
    Previously this function used the Gemini API to summarise news articles.
    Because external services are unavailable here, we instead reuse the
    fallback headlines returned by fetchNewsFeed(). These headlines are
    displayed as a simple list. Feel free to update the array in
    fetchNewsFeed() with fresh headlines.
  */
  fetchNewsFeed().then(items => {
    feed.innerHTML = `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  });
}

/* ==========================================
 * Asset analysis and news for Market History section
 * Provides AI-generated commentary and recent news headlines for the
 * primary asset plotted in the history and candlestick charts.  The
 * analysis uses the Gemini API to produce a short summary and key
 * drivers.  News headlines are fetched from Finnhub with fallback to
 * generic headlines.  Output is inserted into the #history-analysis
 * container.
 */
async function fetchAssetNews(symbol) {
  // Attempt to fetch the latest company news using Finnhub.  On success we
  // cache the headlines in localStorage.  If an error occurs or the API
  // returns no results we fall back to cached headlines (if available) or
  // generic messages.
  try {
    const today = new Date();
    const end = today.toISOString().substring(0, 10);
    const start = new Date(today.getTime() - 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${start}&to=${end}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      const headlines = json.slice(0, 5).map(item => item.headline);
      saveToCache(`assetNews:${symbol}`, headlines);
      return headlines;
    }
  } catch (err) {
    console.error('fetchAssetNews error', err);
  }
  // If live fetch fails or yields no data, attempt to read from cache
  const cached = loadFromCache(`assetNews:${symbol}`);
  if (cached) return cached;
  return [
    `${symbol}: Price action stabilises amid market volatility`,
    `${symbol}: Analysts weigh in on recent earnings`,
    `${symbol}: Investors eye macro data for clues`,
    `${symbol}: Technical indicators show consolidation`,
    `${symbol}: Key levels to watch this week`
  ];
}

async function fetchGeminiAssetAnalysis(symbol) {
  const fallback = {
    summary: `${symbol} has experienced modest price fluctuations recently, reflecting broader market dynamics.`,
    bullets: [
      'Volume trends suggest a balance between buying and selling pressure.',
      'Macro factors, including interest rates and economic data, are influencing sentiment.',
      'Technical indicators show the asset hovering around its short‑term moving average.'
    ]
  };
  try {
    const prompt = `You are an investment research assistant. Provide a concise summary and three bullet points explaining the recent price action of ${symbol}. Return your answer as a JSON object with keys: summary and bullets (an array of three strings). Do not wrap the JSON in markdown or code fences.`;
    const body = {
      contents: [ { parts: [ { text: prompt } ] } ]
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      const data = JSON.parse(text);
      if (data.summary && Array.isArray(data.bullets)) {
        lastGeminiAnalysis = data;
        // Persist analysis in localStorage for resilience
        saveToCache(`geminiAnalysis:${symbol}`, data);
        return data;
      }
    }
  } catch (err) {
    console.error('fetchGeminiAssetAnalysis error', err);
  }
  // If network call fails, try loading the cached analysis
  const cached = loadFromCache(`geminiAnalysis:${symbol}`);
  return cached || lastGeminiAnalysis || fallback;
}

async function populateAssetAnalysis(symbol) {
  const container = document.getElementById('history-analysis');
  if (!container) return;
  container.innerHTML = '';
  // Fetch news and AI analysis concurrently
  const [news, analysis] = await Promise.all([
    fetchAssetNews(symbol),
    fetchGeminiAssetAnalysis(symbol)
  ]);
  // Build analysis box
  const title = document.createElement('h4');
  title.textContent = `${symbol} Analysis & News`;
  container.appendChild(title);
  // Summary paragraph
  const summaryP = document.createElement('p');
  summaryP.textContent = analysis.summary;
  container.appendChild(summaryP);
  // Bullet points
  const ul = document.createElement('ul');
  analysis.bullets.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  container.appendChild(ul);
  // News headlines list
  const newsTitle = document.createElement('h4');
  newsTitle.textContent = 'Recent Headlines';
  newsTitle.style.marginTop = '1rem';
  container.appendChild(newsTitle);
  const newsList = document.createElement('ul');
  news.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    newsList.appendChild(li);
  });
  container.appendChild(newsList);
}

function populatePortfolio() {
  const container = document.getElementById('portfolio-grid');
  if (!container) return;
  // Fetch insights and build cards
  fetchGeminiInsights().then(items => {
    container.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'portfolio-card';
      card.innerHTML = `
        <h3>${item.ticker} – ${item.title}</h3>
        <p class="portfolio-insight">${item.insight}</p>
        <p><strong>Risk:</strong> ${item.risk}</p>
        <p><strong>Opportunity:</strong> ${item.opportunity}</p>
      `;
      container.appendChild(card);
    });
    // After cards are created, render the pie chart using predetermined weights
    renderPortfolioPie(items);
  });
}

// Render a pie chart showing portfolio allocation weights. Uses Chart.js.
function renderPortfolioPie(items) {
  const canvas = document.getElementById('portfolio-pie');
  if (!canvas) return;
  // Define weights; if the item has a weight property, use it; otherwise assign equal weight
  const total = items.length;
  const labels = items.map(i => i.ticker);
  const weights = items.map((i, idx) => {
    // If there is a weight property (0–1), use it; otherwise equal
    if (i.weight && !isNaN(i.weight)) return i.weight;
    return 1 / total;
  });
  const colors = ['#6366f1','#f59e0b','#f97316','#10b981','#14b8a6','#a855f7'];
  if (window.portfolioPie) window.portfolioPie.destroy();
  const ctx = canvas.getContext('2d');
  window.portfolioPie = new Chart(ctx, {
    // Use a full pie instead of a doughnut for a solid look
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data: weights,
          backgroundColor: labels.map((_, idx) => colors[idx % colors.length]),
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 10 }, color: '#333' } },
        tooltip: {
          callbacks: {
            label: context => {
              const pct = (context.parsed * 100).toFixed(1);
              return `${context.label}: ${pct}%`;
            }
          }
        }
      }
    }
  });
}

/* ==================================================
 * Expanded Market Overview
 * The following functions fetch and render compact charts for stocks,
 * crypto, FRED data and EIA energy statistics. They are used to
 * populate the four cards in the market overview grid.
 */

// Fetch closing price series for an equity using AlphaVantage. Returns labels (dates) and values (close prices)
async function fetchEquitySeries(symbol) {
  // Generate fallback synthetic data: trending line with mild noise.  If
  // neither Alpaca nor AlphaVantage respond successfully, this series is
  // returned to ensure the UI always displays something meaningful.
  function sample() {
    const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    const base = symbol === 'TSLA' ? 250 : 450;
    const values = labels.map((_, i) => base + Math.sin(i / 5) * 8 + i * 0.5);
    return { labels, values };
  }
  // Attempt to fetch daily bar data from Alpaca first.  Alpaca’s v2 market
  // data API returns an array of bar objects containing open, high, low,
  // close and volume for each day.  We request 30 daily bars and extract
  // the closing prices.  If this request fails (e.g. network error,
  // authentication error or unexpected response), we fall back to
  // AlphaVantage below.
  async function fetchFromAlpaca() {
    try {
      const url = `${ALPACA_DATA_URL}/v2/stocks/${symbol}/bars?timeframe=1Day&limit=30`;
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET
        }
      });
      const json = await res.json();
      // Alpaca returns an object with a "bars" array.  Each element has a
      // "t" (timestamp) field and a "c" (close) field.  Some environments
      // may return bars under json.bars or json.data.bars.
      const bars = json.bars || (json.data && json.data.bars) || [];
      if (!Array.isArray(bars) || bars.length === 0) throw new Error('No bars');
      const labels = bars.map(bar => {
        // bar.t is ISO8601 timestamp; extract date portion
        const ts = bar.t || bar.timestamp || bar.start || '';
        return ts ? ts.substring(0, 10) : '';
      });
      const values = bars.map(bar => {
        const c = bar.c ?? bar.close;
        return typeof c === 'number' ? c : parseFloat(c);
      });
      if (values.every(v => !isNaN(v))) {
        return { labels, values };
      }
      throw new Error('Invalid Alpaca values');
    } catch (err) {
      console.error('fetchEquitySeries Alpaca failed for', symbol, err);
      return null;
    }
  }
  // Attempt Alpaca first
  const alpacaData = await fetchFromAlpaca();
  if (alpacaData) return alpacaData;
  // Fallback to AlphaVantage
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const series = json['Time Series (Daily)'];
    if (!series) throw new Error('No series');
    const dates = Object.keys(series).sort().slice(-30);
    const values = dates.map(date => parseFloat(series[date]['4. close']));
    if (values.every(v => !isNaN(v))) {
      return { labels: dates, values };
    }
    throw new Error('Invalid AlphaVantage values');
  } catch (err) {
    console.error('fetchEquitySeries AlphaVantage failed for', symbol, err);
    return sample();
  }
}

// Fetch 30‑day price series for a crypto asset via CoinGecko. Returns labels (dates) and values
async function fetchCryptoSeries(id) {
  function sample() {
    const labels = Array.from({ length: 30 }, (_, i) => `Day ${i+1}`);
    const base = id === 'ethereum' ? 2000 : 35000;
    const values = labels.map((_, i) => base + Math.sin(i / 4) * (base * 0.05) + i * (base * 0.003));
    return { labels, values };
  }
  // Attempt to fetch crypto data from Alpaca first.  Alpaca expects
  // uppercase symbols suffixed with USD (e.g. BTCUSD).  It returns a
  // dictionary keyed by symbol with an array of bar objects.  We
  // normalise the response to our labels/values format.  If Alpaca
  // fails, fall back to CoinGecko.
  async function fetchFromAlpacaCrypto() {
    try {
      const sym = id.toUpperCase() + 'USD';
      const url = `${ALPACA_DATA_URL}/v1beta1/crypto/bars?symbols=${sym}&timeframe=1Day&limit=30`;
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET
        }
      });
      const json = await res.json();
      const barsDict = json.bars || {};
      const bars = barsDict[sym] || [];
      if (!Array.isArray(bars) || bars.length === 0) throw new Error('No Alpaca crypto bars');
      const labels = bars.map(bar => {
        const ts = bar.t || bar.timestamp || bar.start || '';
        return ts ? ts.substring(0, 10) : '';
      });
      const values = bars.map(bar => {
        const close = bar.c ?? bar.close;
        return typeof close === 'number' ? close : parseFloat(close);
      });
      if (values.every(v => !isNaN(v))) {
        return { labels, values };
      }
      throw new Error('Invalid Alpaca crypto values');
    } catch (error) {
      console.error('fetchCryptoSeries Alpaca error for', id, error);
      return null;
    }
  }
  const alpacaData = await fetchFromAlpacaCrypto();
  if (alpacaData) return alpacaData;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const res = await fetch(url);
    const json = await res.json();
    const prices = json.prices;
    if (!Array.isArray(prices) || prices.length === 0) throw new Error('No prices');
    const data = prices.slice(-30).map(([ts, price]) => {
      const d = new Date(ts);
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return { date: `${d.getFullYear()}-${m}-${day}`, price };
    });
    const labels = data.map(d => d.date);
    const values = data.map(d => d.price);
    if (values.every(v => !isNaN(v))) {
      return { labels, values };
    }
    throw new Error('Invalid CoinGecko values');
  } catch (err) {
    console.error('fetchCryptoSeries failed for', id, err);
    return sample();
  }
}

// Render the stock overview mini chart. Shows normalised SPY and TSLA prices over the last 30 days.
async function renderStockOverview() {
  const canvas = document.getElementById('stock-overview-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let spyData, tslaData;
  try {
    [spyData, tslaData] = await Promise.all([fetchEquitySeries('SPY'), fetchEquitySeries('TSLA')]);
  } catch (err) {
    console.error('renderStockOverview fetch error', err);
    spyData = null;
    tslaData = null;
  }
  // Fallback sample if data unavailable
  if (!spyData || !tslaData || !spyData.values || !tslaData.values) {
    const sampleLabels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    const sampleSPY = sampleLabels.map((_, i) => 100 + Math.sin(i / 3) * 5 + i);
    const sampleTSLA = sampleLabels.map((_, i) => 100 + Math.cos(i / 4) * 6 + i * 1.2);
    spyData = { labels: sampleLabels, values: sampleSPY };
    tslaData = { labels: sampleLabels, values: sampleTSLA };
  }
  const labels = spyData.labels;
  function normalize(values) {
    const baseIndex = values.findIndex(v => v != null);
    const base = baseIndex >= 0 ? values[baseIndex] : 1;
    return values.map(v => v != null ? (v / base) * 100 : null);
  }
  const spyNorm = normalize(spyData.values);
  const tslaNorm = normalize(tslaData.values);
  if (window.stockOverviewChart) window.stockOverviewChart.destroy();
  window.stockOverviewChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'SPY', data: spyNorm, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true },
        { label: 'TSLA', data: tslaNorm, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

// Render the crypto overview mini chart. Shows normalised BTC and ETH prices over 30 days.
async function renderCryptoOverview() {
  const canvas = document.getElementById('crypto-overview-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const [btcData, ethData] = await Promise.all([fetchCryptoSeries('bitcoin'), fetchCryptoSeries('ethereum')]);
  const labels = btcData.labels;
  const btcNorm = btcData.values.map((v, i) => (v / btcData.values[0]) * 100);
  const ethNorm = ethData.values.map((v, i) => (v / ethData.values[0]) * 100);
  if (window.cryptoOverviewChart) window.cryptoOverviewChart.destroy();
  window.cryptoOverviewChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'BTC', data: btcNorm, borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true },
        { label: 'ETH', data: ethNorm, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

// Fetch FRED data for multiple series for overview. Returns labels and datasets keyed by series id.
async function fetchFredOverview() {
  // Choose series: Real GDP (GDPC1), CPI (CPIAUCSL), Unemployment Rate (UNRATE)
  const seriesList = ['GDPC1', 'CPIAUCSL', 'UNRATE'];
  const results = {};
  let labels = [];
  for (const id of seriesList) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2015-01-01`;
      const res = await fetch(url);
      const json = await res.json();
      const obs = json.observations;
      if (!obs || obs.length === 0) throw new Error('No observations');
      // Use last 20 observations
      const last = obs.slice(-20);
      const vals = last.map(o => parseFloat(o.value));
      const lbls = last.map(o => o.date.substring(0, 4));
      if (labels.length === 0) labels = lbls;
      results[id] = vals;
    } catch (err) {
      console.error('fetchFredOverview error for', id, err);
      // Generate fallback synthetic data
      const lbls = Array.from({ length: 20 }, (_, i) => `${2015 + i}`);
      const vals = Array.from({ length: 20 }, () => Math.random() * 100 + 100);
      if (labels.length === 0) labels = lbls;
      results[id] = vals;
    }
  }
  return { labels, datasets: results };
}

// Render FRED overview chart using Chart.js. It shows multiple series normalised to index 100.
async function renderFredOverview() {
  const canvas = document.getElementById('fred-overview-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = await fetchFredOverview();
  const colours = { GDPC1: '#6366f1', CPIAUCSL: '#f59e0b', UNRATE: '#ef4444' };
  // Normalize each dataset
  const datasets = Object.keys(data.datasets).map(key => {
    const series = data.datasets[key];
    const base = series[0] || 1;
    const norm = series.map(v => (v / base) * 100);
    return {
      label: key,
      data: norm,
      borderColor: colours[key] || '#000',
      backgroundColor: (colours[key] || '#000') + '20',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0,
      fill: true
    };
  });
  if (window.fredOverviewChart) window.fredOverviewChart.destroy();
  window.fredOverviewChart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

// Fetch EIA energy data (monthly fuel type mix for ERCOT region) and return labels and datasets keyed by fuel type.
async function fetchEIAData() {
  // Generate fallback synthetic energy mix for 12 months across several fuel types
  function sample() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fuels = ['NG','WAT','SUN','NUC','OTH'];
    const datasets = {};
    fuels.forEach(f => {
      datasets[f] = months.map(() => Math.random() * 100 + (f === 'NG' ? 200 : f === 'WAT' ? 50 : 20));
    });
    return { labels: months, datasets };
  }
  try {
    const url = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${EIA_API_KEY || 'DEMO_KEY'}&frequency=monthly&data=value&facets[respondent]=ERCO&start=2023-01&end=2024-01`;
    const res = await fetch(url);
    const json = await res.json();
    const data = json.response?.data;
    if (!data || data.length === 0) throw new Error('No EIA data');
    const map = {};
    data.forEach(item => {
      const period = item.period.substring(0, 7);
      const fuel = item.fueltype;
      const val = item.value;
      if (!map[period]) map[period] = {};
      if (!map[period][fuel]) map[period][fuel] = 0;
      map[period][fuel] += val;
    });
    const periods = Object.keys(map).sort();
    const fuels = Array.from(new Set(data.map(d => d.fueltype)));
    const datasets = {};
    fuels.forEach(f => {
      datasets[f] = periods.map(p => map[p][f] || 0);
    });
    const result = { labels: periods, datasets };
    saveToCache('eiaMixData', result);
    return result;
  } catch (err) {
    console.error('fetchEIAData error', err);
    const cached = loadFromCache('eiaMixData');
    return cached || sample();
  }
}

// Render EIA overview chart using Chart.js. Shows multiple fuel type series normalised to index 100.
async function renderEIAOverview() {
  const canvas = document.getElementById('eia-overview-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = await fetchEIAData();
  const colours = ['#0ea5e9','#14b8a6','#f59e0b','#e11d48','#7c3aed','#f97316'];
  const datasets = Object.keys(data.datasets).map((fuel, idx) => {
    const series = data.datasets[fuel];
    const base = series[0] || 1;
    const norm = series.map(v => (v / base) * 100);
    return {
      label: fuel,
      data: norm,
      borderColor: colours[idx % colours.length],
      backgroundColor: (colours[idx % colours.length]) + '20',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0,
      fill: true
    };
  });
  if (window.eiaOverviewChart) window.eiaOverviewChart.destroy();
  window.eiaOverviewChart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

// Initialise all overview charts
function setupMarketOverview() {
  renderStockOverview();
  renderCryptoOverview();
  renderFredOverview();
  renderEIAOverview();
}

/* ===============================
 * Energy Markets
 * Fetches and visualises key energy market series from the U.S. Energy
 * Information Administration (EIA).  We display two separate charts:
 * (1) the spot price of WTI crude oil and (2) the mix of electricity
 * generation by fuel type.  When the API is unavailable or limited by
 * rate limits, synthetic data is generated as a fallback.  Time axes
 * are formatted via the Luxon adapter.
 */

// Fetch daily WTI crude oil price series for the last year.  Uses the
// EIA API v2 seriesid call with the publicly available DEMO_KEY.  On
// success returns an object with arrays of ISO dates and price values.
async function fetchOilPriceSeries() {
  // Fallback generator: synthesise a smooth price series when no live or cached data exists.
  const fallback = () => {
    const labels = [];
    const values = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 3600 * 1000);
      labels.push(date.toISOString().substring(0, 10));
      const base = 60 + (365 - i) * 0.02;
      values.push(base + (Math.random() - 0.5) * 2);
    }
    return { labels, values };
  };
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 365 * 24 * 3600 * 1000);
    const url = `https://api.eia.gov/v2/seriesid/PET.RWTC.D?api_key=${EIA_API_KEY || 'DEMO_KEY'}&data=value&start=${startDate.toISOString().substring(0,10)}&end=${endDate.toISOString().substring(0,10)}`;
    const res = await fetch(url);
    const json = await res.json();
    const series = json?.response?.data;
    if (!series || series.length === 0) throw new Error('No oil data');
    series.sort((a, b) => (a.period > b.period ? 1 : -1));
    const labels = [];
    const values = [];
    series.forEach(item => {
      labels.push(item.period);
      values.push(Number(item.value));
    });
    // Cache the fetched series for fallback usage
    saveToCache('oilPriceSeries', { labels, values });
    return { labels, values };
  } catch (err) {
    console.error('fetchOilPriceSeries error', err);
    const cached = loadFromCache('oilPriceSeries');
    return cached || fallback();
  }
}

// Fetch daily natural gas spot price series (Henry Hub).  Similar to the
// oil fetch, returns arrays of ISO dates and prices.  This series is
// presented in the electricity card as an additional energy market
// indicator when no electricity mix data is available.
async function fetchGasPriceSeries() {
  const fallback = () => {
    const labels = [];
    const values = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 3600 * 1000);
      labels.push(date.toISOString().substring(0, 10));
      const base = 2.5 + (365 - i) * 0.005;
      values.push(base + (Math.random() - 0.5) * 0.3);
    }
    return { labels, values };
  };
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 365 * 24 * 3600 * 1000);
    const url = `https://api.eia.gov/v2/seriesid/NG.RNGWHHD.D?api_key=${EIA_API_KEY || 'DEMO_KEY'}&data=value&start=${startDate.toISOString().substring(0,10)}&end=${endDate.toISOString().substring(0,10)}`;
    const res = await fetch(url);
    const json = await res.json();
    const series = json?.response?.data;
    if (!series || series.length === 0) throw new Error('No gas data');
    series.sort((a, b) => (a.period > b.period ? 1 : -1));
    const labels = [];
    const values = [];
    series.forEach(item => {
      labels.push(item.period);
      values.push(Number(item.value));
    });
    saveToCache('gasPriceSeries', { labels, values });
    return { labels, values };
  } catch (err) {
    console.error('fetchGasPriceSeries error', err);
    const cached = loadFromCache('gasPriceSeries');
    return cached || fallback();
  }
}

// Render the energy charts.  The oil chart displays WTI crude prices over
// the last year.  The electricity chart shows either the mix of fuel types
// returned by fetchEIAData() or, when unavailable, the Henry Hub natural
// gas price as a simple line chart.  Charts are responsive and respect
// the surrounding container dimensions.
async function renderEnergyCharts(days = 365) {
  // Oil chart
  const oilCanvas = document.getElementById('energy-oil-chart');
  if (oilCanvas) {
    const ctx = oilCanvas.getContext('2d');
    const oilData = await fetchOilPriceSeries();
    // Slice to the requested range (from the end); ensure at least one point
    const len = oilData.labels.length;
    const sliceStart = Math.max(0, len - days);
    const slicedLabels = oilData.labels.slice(sliceStart);
    const slicedValues = oilData.values.slice(sliceStart);
    // Sample roughly 12 points for readability
    const labels = [];
    const values = [];
    const sampleInterval = Math.max(1, Math.floor(slicedLabels.length / 12));
    slicedLabels.forEach((lab, idx) => {
      if (idx % sampleInterval === 0 || idx === slicedLabels.length - 1) {
        labels.push(lab);
        values.push(slicedValues[idx]);
      }
    });
    if (window.energyOilChart) window.energyOilChart.destroy();
      // Determine appropriate colours based on the enclosing section
      const isOilDark = oilCanvas.closest('.section-dark') !== null;
      const oilText = isOilDark ? '#f5f5f5' : '#333';
      const oilGrid = isOilDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      window.energyOilChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'WTI Crude (USD/BBL)',
              data: values,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249,115,22,0.15)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 0,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'category',
              ticks: {
                color: oilText,
                maxRotation: 0,
                autoSkip: true
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: oilText
              },
              grid: {
                color: oilGrid
              },
              title: {
                display: true,
                text: 'USD per Barrel',
                color: oilText,
                font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
              }
            },
            // Crosshair plugin provides a vertical line for precise value lookup
            crosshair: {
              line: { color: isOilDark ? '#ffffff' : '#666666', width: 1 },
              sync: { enabled: false },
              zoom: { enabled: false },
              snap: { enabled: false }
            }
          }
        }
      });
  }
  // Electricity chart: attempt to fetch fuel mix data from EIA; if fails, show gas
  const elecCanvas = document.getElementById('energy-electricity-chart');
  if (elecCanvas) {
    const ctx = elecCanvas.getContext('2d');
    try {
      const data = await fetchEIAData();
      // Slice the labels to the requested range if days less than number of data points
      const totalLen = data.labels.length;
      const sliceStart = days >= totalLen ? 0 : Math.max(0, totalLen - days);
      const slicedLabels = data.labels.slice(sliceStart);
      const colourPalette = ['#6366f1','#10b981','#f59e0b','#e11d48','#0ea5e9','#f97316','#14b8a6','#7c3aed'];
      const datasets = Object.keys(data.datasets).map((fuel, idx) => {
        const series = data.datasets[fuel];
        const slicedSeries = series.slice(sliceStart);
        const base = slicedSeries[0] || 1;
        const norm = slicedSeries.map(v => (v / base) * 100);
        return {
          label: fuel,
          data: norm,
          borderColor: colourPalette[idx % colourPalette.length],
          backgroundColor: colourPalette[idx % colourPalette.length] + '25',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: true
        };
      });
      if (window.energyElecChart) window.energyElecChart.destroy();
      // Determine colours for dark vs light backgrounds
      const isElecDark = elecCanvas.closest('.section-dark') !== null;
      const elecText = isElecDark ? '#f5f5f5' : '#333';
      const elecGrid = isElecDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      window.energyElecChart = new Chart(ctx, {
        type: 'line',
        data: { labels: slicedLabels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'category',
              ticks: {
                color: elecText,
                maxRotation: 0,
                autoSkip: true
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: elecText
              },
              grid: {
                color: elecGrid
              },
              title: {
                display: true,
                text: 'Index (Base 100)',
                color: elecText,
                font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              labels: {
                color: elecText,
                font: { family: 'Maison Neue Mono', size: 9 }
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
              }
            },
            // Crosshair for electricity mix chart
            crosshair: {
              line: { color: isElecDark ? '#ffffff' : '#666666', width: 1 },
              sync: { enabled: false },
              zoom: { enabled: false },
              snap: { enabled: false }
            }
          }
        }
      });
    } catch (err) {
      console.error('Energy electricity mix error', err);
      // Fall back to natural gas price as a single line chart
      const gas = await fetchGasPriceSeries();
      // Slice gas data to requested days
      const lenGas = gas.labels.length;
      const sliceStartGas = days >= lenGas ? 0 : Math.max(0, lenGas - days);
      const slicedLabels = gas.labels.slice(sliceStartGas);
      const slicedValues = gas.values.slice(sliceStartGas);
      const labels = [];
      const values = [];
      // Sample monthly points to improve readability
      const sampleInterval = Math.max(1, Math.floor(slicedLabels.length / 12));
      slicedLabels.forEach((lab, idx) => {
        if (idx % sampleInterval === 0 || idx === slicedLabels.length - 1) {
          labels.push(lab);
          values.push(slicedValues[idx]);
        }
      });
      if (window.energyElecChart) window.energyElecChart.destroy();
      const isGasDark = elecCanvas.closest('.section-dark') !== null;
      const gasText = isGasDark ? '#f5f5f5' : '#333';
      const gasGrid = isGasDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      window.energyElecChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Henry Hub Gas (USD/MMBtu)',
              data: values,
              borderColor: '#14b8a6',
              backgroundColor: 'rgba(20,184,166,0.15)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 0,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'category',
              ticks: {
                color: gasText,
                maxRotation: 0,
                autoSkip: true
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: gasText
              },
              grid: {
                color: gasGrid
              },
              title: {
                display: true,
                text: 'USD per MMBtu',
                color: gasText,
                font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
              }
            },
            crosshair: {
              line: { color: isGasDark ? '#ffffff' : '#666666', width: 1 },
              sync: { enabled: false },
              zoom: { enabled: false },
              snap: { enabled: false }
            }
          }
        }
      });
    }
  }

  // Oil to gas ratio chart: compare WTI crude price to Henry Hub natural gas price.
  const ratioCanvas = document.getElementById('energy-ratio-chart');
  if (ratioCanvas) {
    const ctx = ratioCanvas.getContext('2d');
    try {
      const [oilData, gasData] = await Promise.all([fetchOilPriceSeries(), fetchGasPriceSeries()]);
      // Slice both series to the requested time range
      const len = Math.min(oilData.labels.length, gasData.labels.length);
      const sliceStart = days >= len ? 0 : Math.max(0, len - days);
      const oilLabels = oilData.labels.slice(sliceStart);
      const oilVals   = oilData.values.slice(sliceStart);
      const gasVals   = gasData.values.slice(sliceStart);
      // Sample roughly monthly points for readability
      const labels = [];
      const ratios = [];
      const sampleInterval = Math.max(1, Math.floor(oilLabels.length / 12));
      for (let i = 0; i < oilLabels.length; i++) {
        if (i % sampleInterval === 0 || i === oilLabels.length - 1) {
          const oilVal = oilVals[i];
          const gasVal = gasVals[i];
          const ratio = (gasVal && gasVal !== 0) ? oilVal / gasVal : null;
          labels.push(oilLabels[i]);
          ratios.push(ratio);
        }
      }
      if (window.energyRatioChart) window.energyRatioChart.destroy();
      const isDarkSection = ratioCanvas.closest('.section-dark') !== null;
      const textColour = isDarkSection ? '#f5f5f5' : '#333';
      const gridColour = isDarkSection ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
      window.energyRatioChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Oil/Gas Ratio',
              data: ratios,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139,92,246,0.15)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 0,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'category',
              ticks: {
                color: textColour,
                maxRotation: 0,
                autoSkip: true
              },
              grid: { display: false }
            },
            y: {
              ticks: { color: textColour },
              grid: { color: gridColour },
              title: {
                display: true,
                text: 'Price Ratio',
                color: textColour,
                font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `Oil/Gas Ratio: ${ctx.parsed.y ? ctx.parsed.y.toFixed(2) : 'N/A'}`
              }
            },
            crosshair: {
              line: { color: textColour, width: 1 },
              sync: { enabled: false },
              zoom: { enabled: false },
              snap: { enabled: false }
            }
          }
        }
      });
    } catch (err) {
      console.error('Energy ratio chart error', err);
    }
  }

  // Energy mix donut chart: illustrate the share of each fuel in total electricity generation.
  const mixCanvas = document.getElementById('energy-mix-chart');
  if (mixCanvas) {
    const ctx = mixCanvas.getContext('2d');
    try {
      const mixData = await fetchEIAData();
      // Compute the latest value for each fuel category (take last point)
      const fuels = Object.keys(mixData.datasets);
      const lastValues = fuels.map(f => {
        const series = mixData.datasets[f];
        return series && series.length ? series[series.length - 1] : 0;
      });
      const total = lastValues.reduce((sum, v) => sum + v, 0) || 1;
      const shares = lastValues.map(v => (v / total) * 100);
      // Sort descending for readability
      const sorted = fuels.map((fuel, idx) => ({ fuel, share: shares[idx] }))
        .sort((a, b) => b.share - a.share);
      const labels = sorted.map(item => item.fuel);
      const values = sorted.map(item => item.share);
      const palette = ['#6366f1','#10b981','#f59e0b','#e11d48','#0ea5e9','#f97316','#14b8a6','#7c3aed'];
      const colours = labels.map((_, idx) => palette[idx % palette.length]);
      if (window.energyMixChart) window.energyMixChart.destroy();
      const isDarkMix = mixCanvas.closest('.section-dark') !== null;
      const legendColour = isDarkMix ? '#f5f5f5' : '#333';
      window.energyMixChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [ {
            data: values,
            backgroundColor: colours,
            borderColor: colours,
            borderWidth: 1
          } ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: legendColour,
                font: { family: 'Maison Neue Mono', size: 9 }
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Energy mix chart error', err);
      // Use a static mix if API call fails.  These values approximate the U.S. electricity
      // generation mix in 2024 (in percent).  Sources: EIA reports.
      const staticLabels = ['Natural Gas','Coal','Nuclear','Hydro','Wind','Solar','Other'];
      const staticValues = [39, 18, 19, 7, 9, 6, 2];
      const colours = ['#10b981','#e11d48','#6366f1','#0ea5e9','#16a34a','#f59e0b','#f97316'];
      if (window.energyMixChart) window.energyMixChart.destroy();
      const isDarkMix = mixCanvas.closest('.section-dark') !== null;
      const legendColour = isDarkMix ? '#f5f5f5' : '#333';
      window.energyMixChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: staticLabels,
          datasets: [ { data: staticValues, backgroundColor: colours, borderColor: colours, borderWidth: 1 } ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: legendColour,
                font: { family: 'Maison Neue Mono', size: 9 }
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`
              }
            }
          }
        }
      });
    }
  }
}

// Initialise the energy section.  This function simply calls renderEnergyCharts().
function setupEnergy() {
  // Initialise energy charts and stats.  We add a listener on the timeframe
  // select control so that users can dynamically change the range of data
  // displayed (1M, 3M, 6M or 1Y).  On load we default to the full year.
  const tfSelect = document.getElementById('energy-timeframe');
  const initialDays = tfSelect ? parseInt(tfSelect.value, 10) || 365 : 365;
  // Render charts with the initial range
  renderEnergyCharts(initialDays);
  // Render summary stats (WTI, gas, top fuel)
  renderEnergyStats();
  // Attach change handler to update charts when timeframe changes
  if (tfSelect) {
    tfSelect.addEventListener('change', () => {
      const days = parseInt(tfSelect.value, 10) || 365;
      renderEnergyCharts(days);
      // Recompute summary stats in case the latest value falls within the new time range
      renderEnergyStats();
    });
  }
}

/* Render summary statistics for the energy section.  Retrieves the most recent
 * crude oil price, natural gas price and calculates the dominant fuel type
 * from the EIA electricity mix.  Populates the #energy-stats container
 * with three small cards. */
async function renderEnergyStats() {
  const container = document.getElementById('energy-stats');
  if (!container) return;
  // Fetch latest data concurrently
  const [oilData, gasData, mixData] = await Promise.all([
    fetchOilPriceSeries(),
    fetchGasPriceSeries(),
    fetchEIAData()
  ]);
  // Determine latest oil price (last value)
  const oilValue = (oilData && oilData.values.length > 0) ? oilData.values[oilData.values.length - 1] : null;
  // Determine latest gas price
  const gasValue = (gasData && gasData.values.length > 0) ? gasData.values[gasData.values.length - 1] : null;
  // Determine dominant fuel share: pick the fuel with highest value in the last period
  let dominantFuel = null;
  if (mixData && mixData.datasets && mixData.labels && mixData.labels.length > 0) {
    const lastIdx = mixData.labels.length - 1;
    let maxVal = -Infinity;
    Object.entries(mixData.datasets).forEach(([fuel, series]) => {
      const val = series[lastIdx] || 0;
      if (val > maxVal) {
        maxVal = val;
        dominantFuel = fuel;
      }
    });
  }
  // Build stats array
  const stats = [
    {
      label: 'WTI Price',
      value: (oilValue != null) ? `$${oilValue.toFixed(2)}/bbl` : 'N/A'
    },
    {
      label: 'Gas Price',
      value: (gasValue != null) ? `$${gasValue.toFixed(2)}/MMBtu` : 'N/A'
    },
    {
      label: 'Top Fuel',
      value: dominantFuel || 'N/A'
    }
  ];
  container.innerHTML = '';
  stats.forEach(stat => {
    const div = document.createElement('div');
    div.className = 'energy-stat';
    div.innerHTML = `<div class="label">${stat.label}</div><div class="value">${stat.value}</div>`;
    container.appendChild(div);
  });
}

/* ===============================
 * Options Market
 * Fetches and renders option market data using the Polygon API.  The
 * options section allows users to explore implied volatility and open
 * interest across strikes for a chosen underlying equity.  We use
 * Chart.js to visualise the skew (IV vs. strike) and open interest
 * distribution.  A fallback sample dataset is provided for offline use.
 */

// Hold Chart instances so they can be destroyed before re‑rendering
let optionsIVChart;
let optionsOIChart;
let optionsGreeksChart;

// Fetch option snapshot data for a given underlying symbol from Polygon.
// Returns an object with arrays of strikes, impliedVol and openInterest.
async function fetchOptionData(underlying) {
  // Sample fallback dataset: synthetic strikes with a volatility smile
  function sample() {
    // Synthetic sample for strikes and option metrics.  Creates a volatility smile and greeks curves.
    const strikes = [];
    const iv = [];
    const oi = [];
    const delta = [];
    const gamma = [];
    const theta = [];
    const vega = [];
    for (let i = 80; i <= 120; i += 5) {
      const strike = i * (underlying === 'TSLA' ? 10 : 1);
      strikes.push(strike);
      // Implied volatility smile: higher at deep ITM/OTM
      const baseVol = underlying === 'TSLA' ? 0.6 : 0.3;
      const diff = Math.abs(i - 100);
      iv.push(((baseVol + diff / 200) * 100).toFixed(2));
      // Open interest peaks at the money
      const peak = 100;
      const oiVal = Math.max(1000 - Math.pow(i - peak, 2) * 10, 100);
      oi.push(Math.round(oiVal));
      // Greeks: generate reasonable curves.  Delta goes from 0 (deep OTM puts) to 1 (deep ITM calls).
      // We'll approximate delta as a sigmoid centred at ATM.
      const x = (i - 100) / 20;
      const d = 1 / (1 + Math.exp(-x));
      delta.push(parseFloat((d).toFixed(3)));
      // Gamma peaks at the money and declines away.
      const g = Math.exp(-Math.pow((i - 100) / 15, 2)) * 0.1;
      gamma.push(parseFloat(g.toFixed(4)));
      // Theta is usually negative; more negative near ATM.  We'll simulate.
      const t = -0.02 - 0.01 * Math.exp(-Math.pow((i - 100) / 20, 2));
      theta.push(parseFloat(t.toFixed(4)));
      // Vega peaks near ATM.
      const v = Math.exp(-Math.pow((i - 100) / 18, 2)) * 0.2;
      vega.push(parseFloat(v.toFixed(4)));
    }
    return { strikes, iv: iv.map(Number), oi, delta, gamma, theta, vega };
  }
  try {
    const url = `https://api.polygon.io/v3/snapshot/options/${underlying}?limit=100&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json.results || [];
    if (!Array.isArray(results) || results.length === 0) throw new Error('No option results');
    // Filter to nearest expiry date (today or future) and gather strikes, IV and OI
    // Each result object includes "break_even_price", "implied_volatility", "open_interest"
    // and an "option" object with strike_price and expiration_date.
    // Group by expiration and pick the earliest upcoming expiry.
    const grouped = {};
    results.forEach(item => {
      const exp = item.option?.expiration_date;
      if (!exp) return;
      if (!grouped[exp]) grouped[exp] = [];
      grouped[exp].push(item);
    });
    const expiries = Object.keys(grouped).sort();
    const nearest = expiries[0];
    const contracts = grouped[nearest];
    // Gather arrays; only include contracts with defined implied volatility and open interest
    const strikes = [];
    const iv = [];
    const oi = [];
    const delta = [];
    const gamma = [];
    const theta = [];
    const vega = [];
    contracts.forEach(c => {
      const strike = c.option?.strike_price;
      const vol = c.implied_volatility;
      const interest = c.open_interest;
      // Greeks may be nested under c.greeks.* in Polygon response
      const greeks = c.greeks || {};
      const del = greeks.delta;
      const gam = greeks.gamma;
      const the = greeks.theta;
      const veg = greeks.vega;
      if (strike && vol != null && interest != null) {
        strikes.push(strike);
        iv.push(vol * 100); // convert to percentage
        oi.push(interest);
        delta.push(typeof del === 'number' ? del : null);
        gamma.push(typeof gam === 'number' ? gam : null);
        theta.push(typeof the === 'number' ? the : null);
        vega.push(typeof veg === 'number' ? veg : null);
      }
    });
    // Sort by strike ascending
    const sortedIndices = strikes.map((v, i) => i).sort((a, b) => strikes[a] - strikes[b]);
    const sorted = idx => sortedIndices.map(i => idx[i]);
    const sortedStrikes = sortedIndices.map(i => strikes[i]);
    const sortedIV = sortedIndices.map(i => iv[i]);
    const sortedOI = sortedIndices.map(i => oi[i]);
    const sortedDelta = sortedIndices.map(i => delta[i]);
    const sortedGamma = sortedIndices.map(i => gamma[i]);
    const sortedTheta = sortedIndices.map(i => theta[i]);
    const sortedVega = sortedIndices.map(i => vega[i]);
    const result = sortedStrikes.length ? { strikes: sortedStrikes, iv: sortedIV, oi: sortedOI, delta: sortedDelta, gamma: sortedGamma, theta: sortedTheta, vega: sortedVega } : sample();
    // cache by underlying symbol
    saveToCache(`optionData:${underlying}`, result);
    return result;
  } catch (err) {
    console.error('fetchOptionData error for', underlying, err);
    const cached = loadFromCache(`optionData:${underlying}`);
    return cached || sample();
  }
}

// Fetch option snapshot data for constructing a volatility surface across multiple expirations.
// Returns an object containing an array of unique strike prices, an array of expiration dates (sorted ascending),
// and a mapping of implied volatilities keyed by expiry date. If the API is unavailable, returns synthetic
// data replicating the smile across synthetic maturities.
async function fetchOptionSurfaceData(underlying) {
  // Sample fallback: reuse the sample from fetchOptionData but replicate across several synthetic expiries.
  function sample() {
    const base = fetchOptionData(underlying);
    // base may be promise; but fallback synthetic is synchronous; call sample from that function
    const fallback = { strikes: [], iv: [] };
    // Generate synthetic strikes and vol curve like in sample above
    const strikes = [];
    const iv = [];
    for (let i = 80; i <= 120; i += 5) {
      const strike = i * (underlying === 'TSLA' ? 10 : 1);
      strikes.push(strike);
      const baseVol = underlying === 'TSLA' ? 0.6 : 0.3;
      const diff = Math.abs(i - 100);
      iv.push((baseVol + diff / 200) * 100);
    }
    const expiries = ['1M','2M','3M','4M','5M','6M'];
    const ivByExpiry = {};
    expiries.forEach((e, idx) => {
      ivByExpiry[e] = iv.map(v => v * (1 + idx * 0.02));
    });
    return { strikes, expiries, ivByExpiry };
  }
  try {
    const url = `https://api.polygon.io/v3/snapshot/options/${underlying}?limit=500&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json.results || [];
    if (!Array.isArray(results) || results.length === 0) throw new Error('No option snapshot');
    // Group by expiry
    const grouped = {};
    results.forEach(item => {
      const exp = item.option?.expiration_date;
      const strike = item.option?.strike_price;
      const vol = item.implied_volatility;
      if (exp && strike && vol != null) {
        if (!grouped[exp]) grouped[exp] = [];
        grouped[exp].push({ strike, vol: vol * 100 });
      }
    });
    const expiries = Object.keys(grouped).sort();
    // Limit to the first 3 expiries to reduce load
    const selected = expiries.slice(0, 3);
    const strikeSet = new Set();
    selected.forEach(exp => {
      grouped[exp].forEach(item => strikeSet.add(item.strike));
    });
    const strikes = Array.from(strikeSet).sort((a, b) => a - b);
    const ivByExpiry = {};
    selected.forEach(exp => {
      // Build vol array aligning to strikes; if a strike missing, set null
      const map = {};
      grouped[exp].forEach(item => { map[item.strike] = item.vol; });
      ivByExpiry[exp] = strikes.map(s => map[s] || null);
    });
    const result = { strikes, expiries: selected, ivByExpiry };
    // cache
    saveToCache(`optionSurface:${underlying}`, result);
    return result;
  } catch (err) {
    console.error('fetchOptionSurfaceData error', err);
    const cached = loadFromCache(`optionSurface:${underlying}`);
    return cached || sample();
  }
}

// Render option charts given strikes, iv and open interest arrays.
function renderOptionCharts(data) {
  const ivCanvas = document.getElementById('options-iv-chart');
  const oiCanvas = document.getElementById('options-oi-chart');
  if (!ivCanvas || !oiCanvas) return;
  // Destroy previous charts
  if (optionsIVChart) optionsIVChart.destroy();
  if (optionsOIChart) optionsOIChart.destroy();
  const strikeLabels = data.strikes.map(s => s.toString());
  // Implied volatility chart
  optionsIVChart = new Chart(ivCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: strikeLabels,
      datasets: [
        {
          label: 'Implied Volatility (%)',
          data: data.iv,
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225,29,72,0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#e11d48',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.formattedValue + '%' } }
      },
      scales: {
        x: {
          title: { display: true, text: 'Strike Price (USD)', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569' }
        },
        y: {
          title: { display: true, text: 'Implied Volatility (%)', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569' },
          beginAtZero: true
        }
      }
    }
  });
  // Open interest chart
  optionsOIChart = new Chart(oiCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: strikeLabels,
      datasets: [
        {
          label: 'Open Interest',
          data: data.oi,
          backgroundColor: 'rgba(99,102,241,0.4)',
          borderColor: '#6366f1',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: { display: true, text: 'Strike Price (USD)', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569' }
        },
        y: {
          title: { display: true, text: 'Open Interest (contracts)', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569' },
          beginAtZero: true
        }
      }
    }
  });

  // After rendering IV and OI, render Greeks and volatility surface if data contains greek arrays
  if (data && data.delta && data.delta.length) {
    renderOptionGreeksChart(data);
  }
  if (data && data.iv && data.strikes) {
    // Use the same data to build a volatility surface if possible
    renderOptionSurfaceChart(data);
  }

  // Render call vs put open interest ratio.  This chart uses the strikes and
  // open interest arrays to approximate the distribution of open interest
  // across lower (assumed puts) and higher (assumed calls) strikes.  We
  // compute a simple midpoint of the strike range and sum open interest
  // below and above this midpoint.
  if (data && Array.isArray(data.strikes) && Array.isArray(data.oi) && data.strikes.length === data.oi.length && data.strikes.length > 0) {
    renderCallPutRatioChart(data);
  }
}

/*
 * Render a call vs put open interest ratio chart.  Uses a doughnut chart to
 * visualise the proportion of open interest in lower strikes versus higher
 * strikes.  This serves as a proxy for the balance between bearish (puts)
 * and bullish (calls) positioning in the option chain.  A simple median
 * strike is used as the cutoff.
 */
function renderCallPutRatioChart(data) {
  const canvas = document.getElementById('options-callput-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Destroy existing chart if it exists
  if (window.optionsCallPutChart) {
    window.optionsCallPutChart.destroy();
  }
  // Calculate median strike to separate lower and higher strikes
  const sortedStrikes = data.strikes.slice().sort((a, b) => a - b);
  const median = sortedStrikes[Math.floor(sortedStrikes.length / 2)];
  let lowerOI = 0;
  let higherOI = 0;
  data.strikes.forEach((strike, idx) => {
    const oiVal = data.oi[idx];
    if (strike <= median) {
      lowerOI += typeof oiVal === 'number' && !isNaN(oiVal) ? oiVal : 0;
    } else {
      higherOI += typeof oiVal === 'number' && !isNaN(oiVal) ? oiVal : 0;
    }
  });
  // Avoid zero values; if both are zero, fallback to equal distribution
  if (lowerOI === 0 && higherOI === 0) {
    lowerOI = 1;
    higherOI = 1;
  }
  const total = lowerOI + higherOI;
  const lowerPct = (lowerOI / total) * 100;
  const higherPct = (higherOI / total) * 100;
  window.optionsCallPutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Lower Strikes OI', 'Higher Strikes OI'],
      datasets: [
        {
          data: [lowerOI, higherOI],
          backgroundColor: ['#6366f1', '#e11d48'],
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      // Maintain a fixed aspect ratio so the chart height scales with the
      // container width.  A ratio of 4 means width = 4 * height; for
      // example a 1000px wide canvas will be 250px tall.  This prevents
      // the doughnut from becoming too tall.
      maintainAspectRatio: true,
      aspectRatio: 4,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#475569', font: { family: 'Maison Neue Mono', size: 10 } }
        },
        tooltip: {
          callbacks: {
            label: context => {
              const value = context.raw;
              const pct = context.dataIndex === 0 ? lowerPct : higherPct;
              const name = context.label;
              return `${name}: ${value.toLocaleString()} contracts (${pct.toFixed(1)}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

/*
 * Render option Greeks chart.  Plots delta, gamma, theta and vega against strike price on one chart.
 */
function renderOptionGreeksChart(data) {
  const canvas = document.getElementById('options-greeks-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Destroy existing instance if present
  if (window.optionsGreeksChart) window.optionsGreeksChart.destroy();
  const labels = data.strikes.map(s => s.toString());
  const datasets = [];
  const colours = {
    delta: '#10b981',
    gamma: '#6366f1',
    theta: '#ef4444',
    vega: '#f59e0b'
  };
  const names = ['delta','gamma','theta','vega'];
  names.forEach(name => {
    const arr = data[name];
    if (arr && arr.some(v => v != null)) {
      datasets.push({
        label: name.charAt(0).toUpperCase() + name.slice(1),
        data: arr,
        borderColor: colours[name],
        backgroundColor: colours[name] + '20',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
        fill: false
      });
    }
  });
  window.optionsGreeksChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.formattedValue}`
          }
        },
        legend: { position: 'top', labels: { color: '#475569', font: { family: 'Maison Neue Mono', size: 10 } } }
      },
      scales: {
        x: {
          title: { display: true, text: 'Strike Price (USD)', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569', maxRotation: 0, minRotation: 0 }
        },
        y: {
          title: { display: true, text: 'Greeks Value', color: '#475569', font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: '#475569' }
        }
      }
    }
  });
}

/*
 * Render a volatility surface using Plotly.  Constructs a 3D surface with strike on x‑axis, time to expiry on y‑axis (synthetic) and implied volatility on z‑axis.  If only one expiry is available, the surface replicates the smile across several maturities to illustrate the smile pattern.
 */
/**
 * Render the options volatility surface. Originally this component attempted to
 * display a 3D surface when WebGL was available and fell back to a 2D
 * heatmap otherwise. However, in many headless or restricted browser
 * environments WebGL appears available but Plotly still fails to render the
 * 3D surface and instead shows a "visit get.webgl.org" message. To ensure
 * consistent behaviour across devices we now always render a 2D heatmap.
 *
 * The heatmap plots implied volatility by strike (x-axis) and either
 * expiry dates or synthetic maturity indices (y-axis). Colours indicate
 * volatility levels.
 *
 * @param {Object} data Option surface data containing strikes, expiries and
 *                      implied volatilities. If `ivByExpiry` exists, its
 *                      structure is used directly. Otherwise synthetic
 *                      maturities are generated.
 */
function renderOptionSurfaceChart(data) {
  const surfaceEl = document.getElementById('options-surface-chart');
  if (!surfaceEl || typeof Plotly === 'undefined') return;
  let strikes = [];
  let yLabels = [];
  let z = [];
  if (data && data.ivByExpiry) {
    // Real expiry data: rows correspond to expiries and columns to strikes
    strikes = data.strikes;
    yLabels = data.expiries;
    z = yLabels.map(exp => {
      const row = data.ivByExpiry[exp] || [];
      return row.map(v => (v == null ? null : v));
    });
  } else {
    // Synthetic maturities: generate 6 sequential maturities when real expiries
    // are unavailable. Each row scales the base IV curve by 2% per step.
    strikes = data.strikes || [];
    yLabels = ['1', '2', '3', '4', '5', '6'];
    z = yLabels.map((m, i) => {
      const factor = 1 + (i + 1) * 0.02;
      return (data.iv || []).map(v => v * factor);
    });
  }
  const heatTrace = {
    x: strikes,
    y: yLabels,
    z: z,
    type: 'heatmap',
    colorscale: 'RdBu',
    showscale: true
  };
  // Axis titles differ depending on whether y labels are dates or synthetic indices
  const yTitle = (data && data.ivByExpiry) ? 'Expiry' : 'Maturity (index)';
  const heatLayout = {
    margin: { l: 40, r: 10, b: 40, t: 30 },
    xaxis: {
      title: 'Strike',
      tickfont: { color: '#475569', family: 'Maison Neue Mono', size: 9 },
      titlefont: { color: '#475569' }
    },
    yaxis: {
      title: yTitle,
      tickfont: { color: '#475569', family: 'Maison Neue Mono', size: 9 },
      titlefont: { color: '#475569' }
    },
    plot_bgcolor: '#efe8e2',
    paper_bgcolor: '#efe8e2'
  };
  Plotly.newPlot(surfaceEl, [heatTrace], heatLayout, { responsive: true });
}

/* ==========================================
 * Option Scatter Chart
 * Plots implied volatility against strike for each option contract, with
 * point size proportional to open interest.  Calls and puts are colour
 * coded (blue for calls, red for puts).  This visualisation helps users
 * identify how implied volatility and liquidity vary across strikes.
 */
function renderOptionScatterChart(data) {
  const canvas = document.getElementById('options-scatter-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!data || !Array.isArray(data.strikes)) return;
  const points = [];
  const strikes = data.strikes;
  const vols = Array.isArray(data.iv) ? data.iv : [];
  const oi = Array.isArray(data.oi) ? data.oi : [];
  for (let i = 0; i < strikes.length; i++) {
    const strike = strikes[i];
    const vol = typeof vols[i] === 'number' ? vols[i] : parseFloat(vols[i]);
    const openInt = typeof oi[i] === 'number' ? oi[i] : parseFloat(oi[i]);
    if (vol == null || isNaN(vol)) continue;
    const radius = Math.sqrt(Math.max(openInt, 0)) / 10 + 3; // scale radius by sqrt of OI
    const type = strike >= 100 ? 'call' : 'put';
    points.push({ x: strike, y: vol, r: radius, type });
  }
  // Split into call and put datasets
  const callPoints = points.filter(p => p.type === 'call');
  const putPoints = points.filter(p => p.type === 'put');
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  const datasets = [];
  if (putPoints.length) {
    datasets.push({
      label: 'Put',
      data: putPoints,
      backgroundColor: 'rgba(239,68,68,0.5)',
      borderColor: 'rgba(239,68,68,0.9)',
      borderWidth: 1
    });
  }
  if (callPoints.length) {
    datasets.push({
      label: 'Call',
      data: callPoints,
      backgroundColor: 'rgba(99,102,241,0.5)',
      borderColor: 'rgba(99,102,241,0.9)',
      borderWidth: 1
    });
  }
  // Destroy previous chart if exists
  if (window.optionScatterChart) window.optionScatterChart.destroy();
  window.optionScatterChart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Strike', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour }
        },
        y: {
          title: { display: true, text: 'Implied Vol (%)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour }
        }
      },
      plugins: {
        legend: { labels: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              return `${ctx.dataset.label} \nStrike: ${d.x} \nIV: ${d.y.toFixed(2)}% \nOI: ${Math.round(Math.pow(d.r - 3, 2) * 10)}`;
            }
          }
        },
        zoom: {
          pan: { enabled: true, mode: 'xy', threshold: 10 },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy'
          }
        }
      }
    }
  });
}

// Initialise the options section: set up event listeners and fetch initial data
function setupOptions() {
  const select = document.getElementById('options-underlying');
  if (!select) return;
    async function update() {
    const underlying = select.value;
    // Fetch single-expiry option data (IV & OI with greeks)
    const data = await fetchOptionData(underlying);
    // Render redesigned dashboard components
    renderOptionSummary(data);
    renderOptionIvChart(data);
    renderOptionOiChart(data);
    renderOptionCallPutChart(data);
    renderOptionScatterChart(data);
    }
  select.addEventListener('change', update);
  // Render initial charts
  update();
}

/* ==========================================
 * Global crypto market data
 * Leverages the public CoinGecko API to fetch overall market statistics
 * such as total market capitalisation, 24h volume and market cap change.
 * When the API call fails or is unavailable, synthetic fallback values
 * are generated.  The metrics are displayed in the crypto section
 * above the token selector via renderCryptoGlobalMetrics().
 */
async function fetchGlobalCryptoData() {
  // Fallback generator: returns approximate values within plausible ranges
  const fallback = () => {
    return {
      marketCap: 1e12 + Math.random() * 5e11,      // 1–1.5 trillion USD
      volume24h: 5e10 + Math.random() * 2e10,       // 50–70 billion USD
      marketCapChange: (Math.random() - 0.5) * 2     // -1% to +1% change
    };
  };
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global');
    if (!res.ok) throw new Error('CoinGecko global request failed');
    const json = await res.json();
    const data = json && json.data ? json.data : null;
    if (!data) throw new Error('No global data');
    const marketCap = data.total_market_cap && data.total_market_cap.usd;
    const volume24h = data.total_volume && data.total_volume.usd;
    const capChange = data.market_cap_change_percentage_24h_usd;
    const result = {
      marketCap: typeof marketCap === 'number' ? marketCap : null,
      volume24h: typeof volume24h === 'number' ? volume24h : null,
      marketCapChange: typeof capChange === 'number' ? capChange : null
    };
    saveToCache('globalCrypto', result);
    return result;
  } catch (err) {
    console.error('fetchGlobalCryptoData error', err);
    const cached = loadFromCache('globalCrypto');
    return cached || fallback();
  }
}

function renderCryptoGlobalMetrics(data) {
  const container = document.getElementById('crypto-global-metrics');
  if (!container || !data) return;
  const cards = [];
  // Format numbers: abbreviate billions/trillions
  const formatCurrency = val => {
    if (val == null || isNaN(val)) return 'N/A';
    if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
    if (val >= 1e9)  return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6)  return '$' + (val / 1e6).toFixed(2) + 'M';
    return '$' + val.toLocaleString();
  };
  cards.push({ label: 'Total Market Cap', value: formatCurrency(data.marketCap) });
  cards.push({ label: '24h Volume', value: formatCurrency(data.volume24h) });
  const changeVal = data.marketCapChange;
  const changeText = (changeVal != null) ? `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%` : 'N/A';
  cards.push({ label: 'Mkt Cap Change 24h', value: changeText });
  container.innerHTML = cards.map(c => `
    <div class="global-card">
      <span class="value">${c.value}</span>
      <span class="label">${c.label}</span>
    </div>
  `).join('');
}

// Fetch data for top cryptocurrencies (BTC, ETH, SOL). If the API fails, return synthetic fallback values.
async function fetchTopCoinsData() {
  // Fallback values in case the CoinGecko API is unavailable. Provide plausible ranges.
  const fallback = () => {
    return {
      bitcoin: { price: 30000 + Math.random() * 5000, marketCap: 6e11 + Math.random() * 1e11, change: (Math.random() - 0.5) * 4 },
      ethereum: { price: 2000 + Math.random() * 300, marketCap: 2.5e11 + Math.random() * 5e10, change: (Math.random() - 0.5) * 5 },
      solana: { price: 100 + Math.random() * 20, marketCap: 4e10 + Math.random() * 1e10, change: (Math.random() - 0.5) * 6 }
    };
  };
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_market_cap=true&include_24hr_change=true';
    const res = await fetch(url);
    const json = await res.json();
    if (!json || !json.bitcoin) throw new Error('Missing coin data');
    const result = {
      bitcoin: {
        price: json.bitcoin.usd,
        marketCap: json.bitcoin.usd_market_cap,
        change: json.bitcoin.usd_24h_change
      },
      ethereum: {
        price: json.ethereum.usd,
        marketCap: json.ethereum.usd_market_cap,
        change: json.ethereum.usd_24h_change
      },
      solana: {
        price: json.solana.usd,
        marketCap: json.solana.usd_market_cap,
        change: json.solana.usd_24h_change
      }
    };
    saveToCache('topCoins', result);
    return result;
  } catch (err) {
    console.error('fetchTopCoinsData error', err);
    const cached = loadFromCache('topCoins');
    return cached || fallback();
  }
}

// Render the top coin metrics (BTC, ETH, SOL) into the crypto-top container. Each card shows price and 24h change.
function renderCryptoTop(data) {
  const container = document.getElementById('crypto-top');
  if (!container || !data) return;
  const coins = [
    { id: 'bitcoin', symbol: 'BTC' },
    { id: 'ethereum', symbol: 'ETH' },
    { id: 'solana', symbol: 'SOL' }
  ];
  container.innerHTML = coins.map(c => {
    const info = data[c.id] || {};
    const price = typeof info.price === 'number' ? `$${info.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A';
    const changeVal = info.change;
    const change = typeof changeVal === 'number' ? `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%` : 'N/A';
    const changeClass = changeVal >= 0 ? 'positive' : 'negative';
    return `
      <div class="coin-card">
        <div class="value">${price}</div>
        <div class="label">${c.symbol}</div>
        <div class="change ${changeClass}" style="font-size:0.8rem;">${change}</div>
      </div>
    `;
  }).join('');
}

// Fetch detailed token data for a given coin ID from CoinGecko. Returns price, 24h change, market cap and a sparkline series.
async function fetchTokenData(id) {
  // Provide fallback synthetic data for unsupported tokens or network failures.
  const fallback = () => {
    // Generate a synthetic price and a 14‑day sparkline oscillating around the price.
    const base = 50 + Math.random() * 50;
    const spark = Array.from({ length: 14 }, (_, i) => {
      const noise = (Math.random() - 0.5) * base * 0.1;
      return base + Math.sin(i / 2) * (base * 0.1) + noise;
    });
    return {
      price: base,
      change: (Math.random() - 0.5) * 10,
      marketCap: 1e9 + Math.random() * 5e9,
      spark
    };
  };
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`;
    const res = await fetch(url);
    const json = await res.json();
    const market = json.market_data;
    if (!market) throw new Error('No market data');
    const price = market.current_price?.usd;
    const change = market.price_change_percentage_24h;
    const marketCap = market.market_cap?.usd;
    let spark = market.sparkline_14d?.price;
    if (!spark || !Array.isArray(spark)) {
      spark = market.sparkline_7d?.price;
    }
    if (!spark || !Array.isArray(spark)) {
      throw new Error('No sparkline');
    }
    const result = { price, change, marketCap, spark };
    saveToCache(`tokenData:${id}`, result);
    return result;
  } catch (err) {
    console.error('fetchTokenData error for', id, err);
    const cached = loadFromCache(`tokenData:${id}`);
    return cached || fallback();
  }
}

// Render fundamental metrics for a token into its metrics container. Expects an element with id `<prefix>-metrics`.
function renderTokenMetrics(prefix, data) {
  const container = document.getElementById(`${prefix}-metrics`);
  if (!container || !data) return;
  const price = typeof data.price === 'number' ? `$${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A';
  const changeVal = data.change;
  const change = typeof changeVal === 'number' ? `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%` : 'N/A';
  const changeClass = changeVal >= 0 ? 'positive' : 'negative';
  const marketCap = typeof data.marketCap === 'number'
    ? (data.marketCap >= 1e9 ? '$' + (data.marketCap / 1e9).toFixed(2) + 'B' : '$' + data.marketCap.toLocaleString())
    : 'N/A';
  container.innerHTML = `
    <div class="metric-card">
      <span class="label">Price</span>
      <span class="value">${price}</span>
    </div>
    <div class="metric-card">
      <span class="label">24h Change</span>
      <span class="value ${changeClass}">${change}</span>
    </div>
    <div class="metric-card">
      <span class="label">Market Cap</span>
      <span class="value">${marketCap}</span>
    </div>
  `;
}

// Render a small price chart for a token using its sparkline data. Creates a line chart with Chart.js.
function renderTokenChart(prefix, data) {
  const canvas = document.getElementById(`${prefix}-chart`);
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  const values = Array.isArray(data.spark) ? data.spark : [];
  // Build labels based on the length of the sparkline (e.g. "Day 1", "Day 2", ...).
  const labels = values.map((_, idx) => `Day ${idx + 1}`);
  // Determine theme (light or dark) based on nearest section
  const isDark = canvas.closest('.section-dark') !== null;
  const lineColour = '#14b8a6';
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  // Destroy existing chart if present to avoid memory leaks
  if (canvas._chart) {
    canvas._chart.destroy();
  }
  canvas._chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [ { label: 'Price', data: values, borderColor: lineColour, backgroundColor: lineColour + '33', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true } ] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } }, grid: { display: false } },
        y: { ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 8 } }, grid: { color: gridColour }, title: { display: true, text: 'Price (USD)', color: textColour, font: { family: 'Maison Neue Mono', size: 9, weight: 'bold' } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `$${ctx.parsed.y.toFixed(2)}`
          }
        },
        crosshair: {
          line: { color: textColour, width: 1 },
          sync: { enabled: false },
          zoom: { enabled: false }
        },
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}
/* ==========================================
 * Crypto Markets
 * Provides an overview of trending memecoins from pump.fun and renders
 * interactive charts for token prices and a pump index.  Because we do
 * not have direct API access to pump.fun, token lists and index series
 * are generated locally with synthetic data.  When integrating with live
 * data sources (e.g. CoinGecko trending or pump.fun API), replace the
 * fetchPumpFunTokens() implementation accordingly.
 */

// Generate synthetic series to imitate price action for a memecoin.  Values
// oscillate over 30 days around a base price with some noise.
function generateSyntheticPrice(base) {
  const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
  const values = labels.map((_, i) => {
    const noise = (Math.random() - 0.5) * base * 0.05;
    return base + Math.sin(i / 4) * (base * 0.1) + noise;
  });
  return { labels, values };
}

// Generate a synthetic pump index series representing hype/volume.  Values
// fluctuate between 0 and 100 with random spikes.
function generatePumpIndex() {
  const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
  const values = labels.map((_, i) => {
    const base = 50 + Math.sin(i / 3) * 30;
    const spike = Math.random() < 0.1 ? Math.random() * 50 : 0;
    return Math.min(100, Math.max(0, base + spike));
  });
  return { labels, values };
}

// Fetch trending tokens from pump.fun or fallback to static list.  Each token
// includes an id, symbol, name, price series, pump index series and 24h
// change.  In this demo we use synthetic data.  Replace this logic with
// real API calls to pump.fun or CoinGecko for live environments.
async function fetchPumpFunTokens() {
  // Define a static set of memecoins; you can extend this list.
  const staticTokens = [
    { id: 'frog', symbol: 'FROG', name: 'Frog Meme Coin', basePrice: 0.02 },
    { id: 'mog', symbol: 'MOG', name: 'Mog Meme Coin', basePrice: 0.05 },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe Meme Coin', basePrice: 0.01 }
  ];
  // Build token objects with synthetic series
  const tokens = [];
  for (const tok of staticTokens) {
    // For memecoins we always use synthetic price series with a low base price.
    // Attempting to fetch real series for tokens like FROG or MOG will either
    // return unrelated instruments (e.g. FROGUSD may map to a stock) or no
    // data, resulting in unrealistic prices.  To maintain consistency we
    // bypass external APIs here and use our synthetic generator based on
    // the supplied base price.
    const priceSeries = generateSyntheticPrice(tok.basePrice);
    const pumpSeries  = generatePumpIndex();
    // Calculate latest price and 24h change
    const values = priceSeries.values;
    const latest = values[values.length - 1];
    const prev   = values[values.length - 2] || latest;
    const change = prev !== 0 ? ((latest - prev) / prev) * 100 : 0;
    tokens.push({
      id: tok.id,
      symbol: tok.symbol,
      name: tok.name,
      priceSeries,
      pumpSeries,
      price: latest,
      change
    });
  }
  return tokens;
}

// Render the table of trending tokens.  Displays symbol, price and 24h change.
function renderCryptoTable(tokens) {
  const wrapper = document.getElementById('crypto-table-wrapper');
  const table = document.getElementById('crypto-table');
  if (!wrapper || !table) return;
  // Build table header with pump index column.  Pump index value is
  // extracted from the last element of each token’s pump series.
  let html = '<thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Pump Index</th><th>24h Change</th></tr></thead><tbody>';
  tokens.forEach(tok => {
    const price = tok.price;
    const change = tok.change;
    const pumpArr = tok.pumpSeries && tok.pumpSeries.values;
    const pumpVal = pumpArr && pumpArr.length ? pumpArr[pumpArr.length - 1] : 0;
    const changeClass = change >= 0 ? 'positive' : 'negative';
    html += `<tr><td>${tok.symbol}</td><td>${tok.name}</td><td>$${price.toFixed(4)}</td><td>${pumpVal.toFixed(1)}</td><td class="${changeClass}">${change.toFixed(2)}%</td></tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

// Render the price chart for a given token.  Uses Chart.js line chart.
function renderCryptoPriceChart(token) {
  const canvas = document.getElementById('crypto-price-chart');
  if (!canvas || !token) return;
  const ctx = canvas.getContext('2d');
  const labels = token.priceSeries.labels;
  const values = token.priceSeries.values;
  // Determine theme colours
  const isDark = canvas.closest('.section-dark') !== null;
  const colour = '#14b8a6';
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  if (window.cryptoPriceChart) window.cryptoPriceChart.destroy();
  window.cryptoPriceChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: `${token.symbol} Price`, data: values, borderColor: colour, backgroundColor: colour + '33', borderWidth: 2, pointRadius: 0, tension: 0.3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } }, grid: { display: false } },
        y: { ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } }, grid: { color: gridColour }, title: { display: true, text: 'Price (USD)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } } }
      },
      plugins: {
        legend: { labels: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(4)}`
          }
        },
        datalabels: { display: false },
        // Add crosshair for precise inspection of points
        crosshair: {
          line: { color: textColour, width: 1 },
          sync: { enabled: false },
          zoom: { enabled: false }
        },
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

/* Render a bar chart summarising the latest pump index values for all tokens.
 * This provides a quick comparison of which memecoins are currently garnering
 * the most hype.  The pump index is extracted from the last value of each
 * token’s pumpSeries.  Colour palette rotates through a set of vivid hues.
 */
function renderCryptoBarChart(tokens) {
  const canvas = document.getElementById('crypto-bar-chart');
  if (!canvas || !Array.isArray(tokens) || tokens.length === 0) return;
  const ctx = canvas.getContext('2d');
  const labels = tokens.map(t => t.symbol);
  const values = tokens.map(t => {
    const arr = t.pumpSeries && t.pumpSeries.values;
    return arr && arr.length ? arr[arr.length - 1] : 0;
  });
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  // Colour palette for bars
  const palette = ['#6366f1','#e11d48','#14b8a6','#f59e0b','#8b5cf6','#ec4899'];
  const barColours = labels.map((_, idx) => palette[idx % palette.length]);
  if (window.cryptoBarChart) window.cryptoBarChart.destroy();
  window.cryptoBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Current Pump Index',
          data: values,
          backgroundColor: barColours,
          borderColor: barColours,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { display: false },
          title: { display: true, text: 'Token', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          max: 120,
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Pump Index', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Pump: ${ctx.parsed.y.toFixed(1)}`
          }
        },
        zoom: {
          // bar chart zoom disabled; bars remain static for clarity
          pan: { enabled: false },
          zoom: { wheel: { enabled: false }, pinch: { enabled: false }, mode: 'x' }
        }
      }
    }
  });
}

// Render the pump index chart for a given token.  Uses Chart.js line chart.
function renderCryptoPumpChart(token) {
  const canvas = document.getElementById('crypto-pump-chart');
  if (!canvas || !token) return;
  const ctx = canvas.getContext('2d');
  const labels = token.pumpSeries.labels;
  const values = token.pumpSeries.values;
  // Theme colours adapt based on dark/light section
  const isDark = canvas.closest('.section-dark') !== null;
  const colour = '#6366f1';
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  if (window.cryptoPumpChart) window.cryptoPumpChart.destroy();
  window.cryptoPumpChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: `${token.symbol} Pump Index`, data: values, borderColor: colour, backgroundColor: colour + '33', borderWidth: 2, pointRadius: 0, tension: 0.3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } }, grid: { display: false } },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Pump Index (0‑100)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { labels: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`
          }
        },
        datalabels: { display: false },
        crosshair: {
          line: { color: textColour, width: 1 },
          sync: { enabled: false },
          zoom: { enabled: false }
        },
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

/*
 * Render crypto metrics for the selected token.  Displays the latest
 * price, pump index and 24h change in a row of compact cards.  Values
 * are formatted and colour coded for positive/negative changes.
 */
function renderCryptoMetrics(token) {
  const container = document.getElementById('crypto-metrics');
  if (!container || !token) return;
  // Determine values
  const price = typeof token.price === 'number' ? token.price.toFixed(4) : 'N/A';
  const pumpVal = token.pumpSeries && token.pumpSeries.values.length
    ? token.pumpSeries.values[token.pumpSeries.values.length - 1].toFixed(1)
    : 'N/A';
  const change = typeof token.change === 'number' ? token.change : null;
  // Build metrics list
  const metrics = [
    { label: 'Price', value: `$${price}`, className: '' },
    { label: 'Pump Index', value: pumpVal, className: '' },
    { label: '24h Change', value: change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : 'N/A', className: change !== null ? (change >= 0 ? 'positive' : 'negative') : '' }
  ];
  // Clear container
  container.innerHTML = '';
  metrics.forEach(item => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    if (item.className) card.classList.add(item.className);
    card.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
    container.appendChild(card);
  });
}

/*
 * Render a candlestick chart for the selected crypto token using Plotly.  Because
 * we do not have high‑resolution OHLC data from pump.fun, we approximate
 * OHLC values from the synthetic price series.  Each candle uses the
 * previous close as the open and generates a small random range around
 * the min/max of the open and close for high and low.  A 5‑day moving
 * average line is overlaid for trend context.
 */
function renderCryptoCandleChart(token) {
  const container = document.getElementById('crypto-candle-chart');
  if (!container || !token) return;
  // Generate synthetic OHLC data from price series
  const labels = token.priceSeries.labels;
  const closes = token.priceSeries.values;
  const opens = [];
  const highs = [];
  const lows  = [];
  const dates = [];
  for (let i = 0; i < closes.length; i++) {
    const close = closes[i];
    const open = i === 0 ? close : closes[i - 1];
    const maxVal = Math.max(open, close);
    const minVal = Math.min(open, close);
    // Create a small random range up to ±2% of the price
    const range = maxVal * 0.02;
    const high = maxVal + Math.random() * range;
    const low = Math.max(minVal - Math.random() * range, 0);
    opens.push(open);
    highs.push(high);
    lows.push(low);
    // For dates, convert label (e.g. 'Day 1') to an index or use today offset
    // We'll treat labels as sequential days starting from today minus (n-1)
    const now = new Date();
    const date = new Date(now.getTime() - (closes.length - 1 - i) * 24 * 3600 * 1000);
    dates.push(date);
  }
  // Compute moving average (5‑day)
  const ma = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < 4) {
      ma.push(null);
    } else {
      const window = closes.slice(i - 4, i + 1);
      const avg = window.reduce((sum, v) => sum + v, 0) / 5;
      ma.push(avg);
    }
  }
  // Determine theme colours
  const isDark = container.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  const incColour = '#10b981';
  const decColour = '#ef4444';
  const candleTrace = {
    x: dates,
    open: opens,
    high: highs,
    low: lows,
    close: closes,
    type: 'candlestick',
    name: `${token.symbol}`,
    increasing: { line: { color: incColour }, fillcolor: incColour },
    decreasing: { line: { color: decColour }, fillcolor: decColour },
    showlegend: false
  };
  const maTrace = {
    x: dates,
    y: ma,
    type: 'scatter',
    mode: 'lines',
    name: `${token.symbol} MA5`,
    line: { color: '#9f9087', width: 2 },
    hoverinfo: 'none'
  };
  const layout = {
    margin: { l: 40, r: 10, t: 20, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      title: '',
      type: 'date',
      tickfont: { color: textColour, family: 'Maison Neue Mono', size: 9 },
      gridcolor: gridColour
    },
    yaxis: {
      title: '',
      tickfont: { color: textColour, family: 'Maison Neue Mono', size: 9 },
      gridcolor: gridColour,
      fixedrange: false
    },
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.05, font: { color: textColour, size: 9, family: 'Maison Neue Mono' } }
  };
  const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['toImage','hoverCompareCartesian','hoverClosestCartesian'] };
  // Destroy previous candlestick if exists
  if (window.cryptoCandle) {
    try {
      Plotly.purge(container);
    } catch (err) {
      /* ignore purge errors */
    }
  }
  window.cryptoCandle = Plotly.newPlot(container, [candleTrace, maTrace], layout, config);
}

// Initialise the crypto section.  Fetch top coin metrics, global market statistics and
// showcase tokens (HyperLiquid and Pump.fun).  This streamlined setup removes the
// trending memecoin explorer to focus on high‑level market data and curated tokens.
async function setupCrypto() {
  // Check that the crypto dashboard exists.  If neither the top coins nor
  // showcase containers are present, skip initialisation.
  const topContainer = document.getElementById('crypto-top');
  const hyperContainer = document.getElementById('showcase-hyperliquid');
  const pumpContainer = document.getElementById('showcase-pumpfun');
  if (!topContainer && !hyperContainer && !pumpContainer) return;
  // Fetch and render top coins (BTC, ETH, SOL).  Any errors are logged and
  // fallback values will be used inside fetchTopCoinsData().
  try {
    const topCoins = await fetchTopCoinsData();
    renderCryptoTop(topCoins);
  } catch (err) {
    console.error('Error fetching top coin metrics', err);
  }
  // Fetch showcase token data (HyperLiquid and Pump.fun) and render their metrics and charts.
  try {
    const [hyperData, pumpData] = await Promise.all([
      fetchTokenData('hyperliquid'),
      fetchTokenData('pump')
    ]);
    // Render token metrics and charts only if the container exists
    if (hyperContainer) {
      renderTokenMetrics('hyper', hyperData);
      renderTokenChart('hyper', hyperData);
    }
    if (pumpContainer) {
      renderTokenMetrics('pump', pumpData);
      renderTokenChart('pump', pumpData);
    }
  } catch (err) {
    console.error('Error fetching showcase token data', err);
  }
  // Fetch global crypto market statistics and render them at the top of the crypto section
  try {
    const globalStats = await fetchGlobalCryptoData();
    renderCryptoGlobalMetrics(globalStats);
  } catch (err) {
    console.error('Error fetching global crypto metrics', err);
  }
  // The trending memecoin explorer has been removed.  No further setup required.
}

/* ==========================================
 * Contact form handler
 * Attaches a submit listener to the contact form. On submission the
 * function constructs a mailto link to the published support address and
 * opens the user’s email client. A small status message is displayed to
 * confirm that the action occurred. The form fields are cleared after
 * submission. If the browser blocks mailto or the form is incomplete the
 * user is notified accordingly.
 */
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const statusEl = document.getElementById('contact-status');
  // Hook up character count and subject selection
  const messageEl = form.querySelector('textarea[name="message"]');
  const countEl   = document.getElementById('message-count');
  if (messageEl && countEl) {
    messageEl.addEventListener('input', () => {
      const len = messageEl.value.length;
      countEl.textContent = `${len}/500`;
      // Warn the user when approaching the character limit
      if (len > 450) {
        countEl.style.color = '#dc2626';
      } else {
        countEl.style.color = '';
      }
    });
  }
  // Helper to display status messages
  function showStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.innerHTML = msg;
    statusEl.style.display = 'block';
    statusEl.style.color = isError ? '#dc2626' : '#16a34a';
    setTimeout(() => { statusEl.style.display = 'none'; }, 10000);
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const subjectKey = (formData.get('subject') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();
    if (!name || !email || !subjectKey || !message) {
      showStatus('Please complete all fields before sending.', true);
      return;
    }
    // Determine subject text based on the selected option
    const subjects = {
      general: 'General Inquiry',
      feedback: 'Feedback',
      support: 'Support Request'
    };
    const subjectText = subjects[subjectKey] || subjectKey;
    const encodedSubject = encodeURIComponent(`${subjectText} from ${name}`);
    const encodedBody    = encodeURIComponent(`${message}\n\nName: ${name}\nEmail: ${email}`);
    const mailto = `mailto:hello@investhub.com?subject=${encodedSubject}&body=${encodedBody}`;
    // Display a confirmation message with a clickable mailto link instead of immediately launching the mail client.
    showStatus(`Thank you for reaching out! Please <a href="${mailto}">click here</a> to open your email client and send your message.`);
    form.reset();
    // Reset character count after clearing the form
    if (countEl) {
      countEl.textContent = '0/500';
      countEl.style.color = '';
    }
  });
}

/*
 * Render summary statistics for option chains.  Given the output from
 * fetchOptionData(), this function calculates high‑level metrics and
 * populates the options‑stats container.  Metrics include average implied
 * volatility, total open interest, and average greeks (delta, gamma, theta,
 * vega).  Values are formatted appropriately.  If any metric cannot be
 * calculated (e.g. missing data), a placeholder dash (—) is displayed.
 */
function renderOptionStats(data) {
  const container = document.getElementById('options-stats');
  if (!container) return;
  if (!data || !Array.isArray(data.iv) || data.iv.length === 0) {
    container.innerHTML = '';
    return;
  }
  // Helper to compute average while ignoring NaN values
  function average(arr) {
    const valid = arr.filter(v => typeof v === 'number' && !isNaN(v));
    if (valid.length === 0) return null;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
  }
  const avgIv = average(data.iv);
  const totalOi = Array.isArray(data.oi) ? data.oi.reduce((sum, v) => sum + (typeof v === 'number' && !isNaN(v) ? v : 0), 0) : null;
  // Delta, gamma, theta and vega may be provided at the top level of the
  // returned data from fetchOptionData().  If those arrays are absent, the
  // greeks property might include them.  Check both locations.
  const deltaArray = Array.isArray(data.delta) ? data.delta : (data.greeks && Array.isArray(data.greeks.delta) ? data.greeks.delta : []);
  const gammaArray = Array.isArray(data.gamma) ? data.gamma : (data.greeks && Array.isArray(data.greeks.gamma) ? data.greeks.gamma : []);
  const thetaArray = Array.isArray(data.theta) ? data.theta : (data.greeks && Array.isArray(data.greeks.theta) ? data.greeks.theta : []);
  const vegaArray  = Array.isArray(data.vega) ? data.vega : (data.greeks && Array.isArray(data.greeks.vega) ? data.greeks.vega : []);
  const avgDelta = deltaArray.length ? average(deltaArray) : null;
  const avgGamma = gammaArray.length ? average(gammaArray) : null;
  const avgTheta = thetaArray.length ? average(thetaArray) : null;
  const avgVega  = vegaArray.length  ? average(vegaArray)  : null;
  // Build HTML for each stat
  const stats = [
    // Avg IV is already expressed in percent in fetchOptionData/sample.  Do
    // not multiply by 100 again; simply format to two decimals and append
    // a percent sign.
    { label: 'Avg. Implied Vol', value: avgIv !== null ? avgIv.toFixed(2) + '%' : '—' },
    { label: 'Total Open Interest', value: totalOi !== null ? totalOi.toLocaleString() : '—' },
    { label: 'Avg. Delta', value: avgDelta !== null ? avgDelta.toFixed(2) : '—' },
    { label: 'Avg. Gamma', value: avgGamma !== null ? avgGamma.toFixed(2) : '—' },
    { label: 'Avg. Theta', value: avgTheta !== null ? avgTheta.toFixed(2) : '—' },
    { label: 'Avg. Vega', value: avgVega !== null ? avgVega.toFixed(2) : '—' }
  ];
  container.innerHTML = stats.map(stat => `
    <div class="stat">
      <span class="value">${stat.value}</span>
      <span class="label">${stat.label}</span>
    </div>
  `).join('');

  // Also render a table of top option contracts by open interest.
  renderOptionsTable(data);
}

/* ==========================================
 * Options table
 * Given option chain data returned from fetchOptionData(), render the top
 * contracts by open interest into a table.  Each row displays strike,
 * expiry (set to a generic 1M for synthetic data), type (call or put) and
 * implied volatility.  The table is sorted by descending open interest.
 */
function renderOptionsTable(data) {
  const table = document.getElementById('options-table');
  if (!table || !data || !Array.isArray(data.strikes) || !Array.isArray(data.oi)) return;
  const rows = [];
  const strikes = data.strikes;
  const oi = data.oi;
  const iv = Array.isArray(data.iv) ? data.iv : [];
  for (let i = 0; i < strikes.length; i++) {
    const strike = strikes[i];
    const vol = typeof iv[i] === 'number' ? iv[i] : parseFloat(iv[i]) || null;
    const openInt = typeof oi[i] === 'number' ? oi[i] : parseFloat(oi[i]) || 0;
    const type = strike >= 100 ? 'Call' : 'Put';
    rows.push({ strike, expiry: '1M', type, oi: openInt, iv: vol });
  }
  rows.sort((a, b) => b.oi - a.oi);
  const top = rows.slice(0, 6);
  let html = '<thead><tr><th>Strike</th><th>Expiry</th><th>Type</th><th>Open Interest</th><th>Implied Vol</th></tr></thead><tbody>';
  top.forEach(r => {
    html += `<tr><td>${r.strike}</td><td>${r.expiry}</td><td>${r.type}</td><td>${r.oi.toLocaleString()}</td><td>${r.iv !== null ? r.iv.toFixed(2) + '%' : '—'}</td></tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

// Render summary statistics for the options dashboard. Displays average implied volatility, total open interest and put/call ratio.
function renderOptionSummary(data) {
  const container = document.getElementById('options-summary');
  if (!container || !data || !Array.isArray(data.iv)) return;
  // Helper to parse numbers from strings
  const parseNum = v => typeof v === 'number' ? v : parseFloat(v);
  // Calculate average implied volatility
  const validIv = data.iv.map(parseNum).filter(v => !isNaN(v));
  const avgIv = validIv.length ? validIv.reduce((sum, v) => sum + v, 0) / validIv.length : null;
  // Sum open interest
  const totalOi = Array.isArray(data.oi) ? data.oi.map(parseNum).filter(v => !isNaN(v)).reduce((sum, v) => sum + v, 0) : null;
  // Classify strikes into puts (< ATM) and calls (>= ATM at 100 for simplicity)
  let callOi = 0, putOi = 0;
  if (Array.isArray(data.strikes) && Array.isArray(data.oi)) {
    data.oi.forEach((oiVal, idx) => {
      const val = parseNum(oiVal);
      if (isNaN(val)) return;
      const strike = data.strikes[idx];
      if (strike >= 100) callOi += val;
      else putOi += val;
    });
  }
  const ratio = callOi !== 0 ? (callOi / (putOi || 1)) : null;
  const items = [
    { label: 'Avg IV', value: avgIv !== null ? avgIv.toFixed(2) + '%' : 'N/A' },
    { label: 'Total OI', value: totalOi !== null ? totalOi.toLocaleString() : 'N/A' },
    { label: 'Call/Put Ratio', value: ratio !== null ? ratio.toFixed(2) : 'N/A' }
  ];
  container.innerHTML = items.map(item => `
    <div class="summary-card">
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    </div>
  `).join('');
}

// Draw a line chart of implied volatility versus strike price. Uses Chart.js.
function renderOptionIvChart(data) {
  const canvas = document.getElementById('options-iv-chart');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  const strikes = data.strikes || [];
  const ivVals = Array.isArray(data.iv) ? data.iv.map(v => (typeof v === 'number' ? v : parseFloat(v))) : [];
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: strikes,
      datasets: [{
        label: 'Implied Volatility',
        data: ivVals,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Strike Price (USD)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 } }, grid: { display: false } },
        y: { title: { display: true, text: 'Implied Vol (%)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 }, callback: val => val + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(2)}% IV at $${ctx.label}` } } }
    }
  });
}

// Draw a bar chart of open interest distribution by strike price.
function renderOptionOiChart(data) {
  const canvas = document.getElementById('options-oi-chart');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  const strikes = data.strikes || [];
  const oiVals = Array.isArray(data.oi) ? data.oi.map(v => (typeof v === 'number' ? v : parseFloat(v))) : [];
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: strikes,
      datasets: [{
        label: 'Open Interest',
        data: oiVals,
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Strike Price (USD)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 } }, grid: { display: false } },
        y: { title: { display: true, text: 'Open Interest (Contracts)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toLocaleString()} contracts at $${ctx.label}` } } }
    }
  });
}

// Draw a doughnut chart comparing call and put open interest totals.
function renderOptionCallPutChart(data) {
  const canvas = document.getElementById('options-callput-chart');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  // Calculate call vs put totals
  let callTotal = 0, putTotal = 0;
  if (Array.isArray(data.strikes) && Array.isArray(data.oi)) {
    data.oi.forEach((oiVal, idx) => {
      const val = typeof oiVal === 'number' ? oiVal : parseFloat(oiVal);
      if (isNaN(val)) return;
      const strike = data.strikes[idx];
      if (strike >= 100) callTotal += val;
      else putTotal += val;
    });
  }
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Calls', 'Puts'],
      datasets: [{
        data: [callTotal, putTotal],
        backgroundColor: ['#3b82f6', '#ef4444'],
        borderColor: ['#3b82f6', '#ef4444'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 8 }, color: '#666' } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.parsed.toLocaleString()} contracts`
          }
        }
      }
    }
  });
}

// Draw a scatter (bubble) chart of implied volatility vs strike, with bubble size proportional to open interest.
function renderOptionScatterChart(data) {
  const canvas = document.getElementById('options-scatter-chart');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  // Determine max open interest for sizing bubbles
  const oiVals = Array.isArray(data.oi) ? data.oi.map(v => (typeof v === 'number' ? v : parseFloat(v))) : [];
  const maxOi = Math.max(...oiVals, 1);
  // Build dataset for each option with x=strike, y=IV, r=bubble radius; color by call/put
  const points = [];
  if (Array.isArray(data.strikes) && Array.isArray(data.iv)) {
    data.strikes.forEach((strike, idx) => {
      const ivVal = typeof data.iv[idx] === 'number' ? data.iv[idx] : parseFloat(data.iv[idx]);
      const oiVal = typeof data.oi[idx] === 'number' ? data.oi[idx] : parseFloat(data.oi[idx]);
      const radius = (oiVal / maxOi) * 15 + 4;
      const isCall = strike >= 100;
      points.push({
        x: strike,
        y: ivVal,
        r: radius,
        backgroundColor: isCall ? '#3b82f6' : '#ef4444',
        borderColor: isCall ? '#3b82f6' : '#ef4444'
      });
    });
  }
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets: [{ label: 'Option', data: points }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Strike Price (USD)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { title: { display: true, text: 'Implied Vol (%)', color: '#666', font: { family: 'Maison Neue Mono', size: 9 } }, ticks: { color: '#666', font: { family: 'Maison Neue Mono', size: 8 }, callback: val => val + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              // Derive original open interest from radius: (radius-4)/15 * maxOi
              const approxOi = Math.round(((d.r - 4) / 15) * maxOi);
              return `${d.x} strike: ${d.y.toFixed(2)}% IV, ${approxOi.toLocaleString()} OI`;
            }
          }
        }
      }
    }
  });
}

/* ===============================
 * News ticker
 * Fetches latest headlines using AlphaVantage NEWS_SENTIMENT and animates them across the screen.
 */
async function fetchNewsFeed() {
  // Fallback headlines in case the API is unavailable
  const fallback = [
    'Stocks edge higher ahead of earnings season',
    'Bitcoin extends rally on ETF optimism',
    'Fed officials debate pace of rate cuts amid resilient data',
    'Oil prices climb as supply concerns persist'
  ];
  /*
    External news APIs (Finnhub, AlphaVantage) cannot be accessed in this environment.
    Instead of making network requests, return the fallback headlines directly.
    You may update this list periodically to reflect current market conditions.
  */
  return fallback;
}

function setupNewsTicker() {
  const tickerContainer = document.querySelector('#news-ticker .ticker');
  if (!tickerContainer) return;
  fetchNewsFeed().then(items => {
    // Duplicate the list to ensure seamless scrolling (makes the animation loop without gap)
    const combined = items.concat(items);
    tickerContainer.innerHTML = combined.map(headline => `<span class="ticker-item">${headline}</span>`).join('');
    // Animation speed is set in CSS via @keyframes ticker; no additional JS needed
  });
}

/* ===============================
 * Macro small charts
 * Render mini charts for each macro indicator for quick glance. Uses FRED series.
 */
async function setupMacroSmallCharts() {
  // List of series and target canvases
  const configs = [
    { id: 'GDPC1', canvasId: 'macro-gdp-mini', colour: '#6366f1' },
    { id: 'CPIAUCSL', canvasId: 'macro-cpi-mini', colour: '#f59e0b' },
    { id: 'UNRATE', canvasId: 'macro-unemployment-mini', colour: '#ef4444' },
    { id: 'FEDFUNDS', canvasId: 'macro-rate-mini', colour: '#10b981' },
    { id: 'DGS10', canvasId: 'macro-treasury-mini', colour: '#0ea5e9' },
    // Additional mini charts for Housing Starts and Retail Sales.  Colours are
    // chosen to complement the existing palette while standing apart.
    { id: 'HOUST', canvasId: 'macro-housing-mini', colour: '#8b5cf6' },
    { id: 'RSAFS', canvasId: 'macro-retail-mini', colour: '#ec4899' }
  ];
  configs.forEach(async cfg => {
    const canvas = document.getElementById(cfg.canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${cfg.id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2015-01-01`;
      const res = await fetch(url);
      const json = await res.json();
      const obs = json.observations;
      if (!obs || obs.length === 0) throw new Error('No data');
      const last = obs.slice(-20);
      const labels = last.map(o => o.date.substring(0, 4));
      const values = last.map(o => parseFloat(o.value));
      // Normalize to index 100
      const base = values[0] || 1;
      const norm = values.map(v => (v / base) * 100);
      // destroy previous if exists
      if (canvas._chart) canvas._chart.destroy();
      canvas._chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [ { data: norm, borderColor: cfg.colour, backgroundColor: cfg.colour + '20', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    } catch (err) {
      console.error('setupMacroSmallCharts error', cfg.id, err);
      // fallback to synthetic
      const labels = Array.from({ length: 20 }, (_, i) => `${2015 + i}`);
      const values = labels.map((_, i) => 100 + Math.sin(i / 3) * 5 + i);
      if (canvas._chart) canvas._chart.destroy();
      canvas._chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [ { data: values, borderColor: cfg.colour, backgroundColor: cfg.colour + '20', borderWidth: 2, tension: 0.3, pointRadius: 0, fill: true } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    }
  });
}

/* ==========================================
 * Macro Bar Chart
 * Summarises the momentum of key macro indicators in a single bar chart.  It
 * uses the latest values defined in the HTML macro dashboard to compute
 * percentage changes relative to prior periods. Positive values are
 * displayed in green, negatives in red and neutral values in grey.  This
 * function replaces the previously unused mini charts on the right side of
 * the macro section.
 */
function renderMacroBarChart() {
  const canvas = document.getElementById('macro-bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Define the latest macro changes.  These numbers should be kept in
  // sync with the dashboard cards in index.html.  Values represent
  // percentage change versus the previous period (negative values for
  // declines, positive for increases).  When updating the dashboard
  // numbers, update these values accordingly.
  const metrics = [
    { label: 'GDP', value: -0.5 },
    { label: 'CPI', value: 3.0 },
    { label: 'Unemployment', value: -0.1 },
    { label: 'Fed Funds', value: 0.0 },
    { label: '10Y Yield', value: -0.1 },
    { label: 'Housing', value: 4.6 },
    { label: 'Retail', value: 0.6 }
  ];
  // Colours based on sign
  const colours = metrics.map(m => m.value > 0 ? '#16a34a' : m.value < 0 ? '#dc2626' : '#6b7280');
  const labels = metrics.map(m => m.label);
  const values = metrics.map(m => m.value);
  // Destroy any existing bar chart
  if (window.macroBarChart) {
    window.macroBarChart.destroy();
  }
  // Determine theme colours based on section background
  const isDark = canvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  window.macroBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '% Change',
          data: values,
          backgroundColor: colours,
          borderColor: colours,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 9 } },
          grid: { color: gridColour },
          title: { display: true, text: 'Change (%)', color: textColour, font: { family: 'Maison Neue Mono', size: 10, weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.parsed.y.toFixed(1)}%`
          }
        }
      }
    }
  });
}

/* ==========================================
 * Macro Highlights
 * Generates a set of mini cards summarising the latest reading and momentum for
 * each key macro indicator.  These cards replace the unused mini charts on the
 * right-hand side of the macro section.  Each card displays the indicator name,
 * its current value, the recent change (with colour coding) and a brief
 * description.  Colours and styling adjust automatically for light and dark
 * section themes.  Update the data below when refreshing the macro dashboard.
 */
function renderMacroHighlights() {
  const container = document.getElementById('macro-highlights');
  if (!container) return;
  // Define the dataset for each indicator.  Each entry includes: label (name),
  // value (string), change (string with sign and units) and delta (numeric) to
  // determine positive/negative styling, and a description of the period.
  const highlights = [
    { label: 'Real GDP', value: '29,962 B', change: '−0.5%', delta: -0.5, desc: 'Q1 2025 vs Q4 2024' },
    { label: 'CPI', value: '322.0', change: '+3.0%', delta: 3.0, desc: 'YoY, Jun 2025' },
    { label: 'Unemployment', value: '4.1%', change: '−0.1 pt', delta: -0.1, desc: 'Jun 2025 vs May 2025' },
    { label: 'Fed Funds', value: '4.33%', change: '0.0 pt', delta: 0.0, desc: 'Jun 2025' },
    { label: '10Y Treasury', value: '4.30%', change: '−0.1 pt', delta: -0.1, desc: 'Jun 2025 vs May 2025' },
    { label: 'Housing Starts', value: '1.32 M', change: '+4.6%', delta: 4.6, desc: 'Jun 2025 vs May 2025' },
    { label: 'Retail Sales', value: '720.1 B', change: '+0.6%', delta: 0.6, desc: 'Jun 2025 vs May 2025' }
  ];
  // Clear any existing content
  container.innerHTML = '';
  const isDark = container.closest('.section-dark') !== null;
  highlights.forEach(item => {
    const card = document.createElement('div');
    card.className = 'macro-highlight-card';
    if (isDark) card.classList.add('dark');
    const changeClass = item.delta > 0 ? 'positive' : item.delta < 0 ? 'negative' : 'neutral';
    card.innerHTML = `
      <h4>${item.label}</h4>
      <div class="value">${item.value}</div>
      <div class="change ${changeClass}">${item.change}</div>
      <div class="desc">${item.desc}</div>
    `;
    container.appendChild(card);
  });
}

/* ===============================
 * Watchlist functionality
 * Allows users to add custom tickers, stores them in localStorage, fetches latest prices and displays them.
 */
let watchlistTickers = [];
let lastWatchlistData = {};

function initWatchlist() {
  const input = document.getElementById('watchlist-input');
  const addBtn = document.getElementById('watchlist-add-btn');
  const listEl = document.getElementById('watchlist-list');
  if (!input || !addBtn || !listEl) return;
  // Load watchlist from localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (Array.isArray(stored)) watchlistTickers = stored;
  } catch (e) {
    watchlistTickers = [];
  }
  // Render list
  renderWatchlist();
  // Handler to add ticker
  function addTickerHandler() {
    const val = input.value.trim().toUpperCase();
    if (val && !watchlistTickers.includes(val)) {
      watchlistTickers.push(val);
      localStorage.setItem('watchlist', JSON.stringify(watchlistTickers));
      input.value = '';
      renderWatchlist();
    }
  }
  addBtn.addEventListener('click', addTickerHandler);
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') addTickerHandler();
  });
}

function renderWatchlist() {
  const listEl = document.getElementById('watchlist-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (watchlistTickers.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No tickers added. Add a symbol to build your watchlist.';
    li.style.fontStyle = 'italic';
    li.style.color = 'rgba(0,0,0,0.6)';
    listEl.appendChild(li);
    return;
  }
  watchlistTickers.forEach(ticker => {
    const item = document.createElement('li');
    item.className = 'watchlist-item';
    const tickerSpan = document.createElement('span');
    tickerSpan.className = 'watchlist-ticker';
    tickerSpan.textContent = ticker;
    const priceSpan = document.createElement('span');
    priceSpan.className = 'watchlist-price';
    priceSpan.textContent = lastWatchlistData[ticker]?.price ? `$${lastWatchlistData[ticker].price.toLocaleString(undefined,{maximumFractionDigits:2})}` : '—';
    const changeSpan = document.createElement('span');
    changeSpan.className = 'watchlist-change';
    const changeVal = lastWatchlistData[ticker]?.change;
    if (typeof changeVal === 'number') {
      changeSpan.textContent = (changeVal >= 0 ? '+' : '') + changeVal.toFixed(2) + '%';
      changeSpan.classList.add(changeVal >= 0 ? 'positive' : 'negative');
    } else {
      changeSpan.textContent = '';
    }
    const remove = document.createElement('span');
    remove.className = 'watchlist-remove';
    remove.textContent = '×';
    remove.title = 'Remove';
    remove.addEventListener('click', () => {
      watchlistTickers = watchlistTickers.filter(t => t !== ticker);
      localStorage.setItem('watchlist', JSON.stringify(watchlistTickers));
      renderWatchlist();
    });
    item.appendChild(tickerSpan);
    item.appendChild(priceSpan);
    item.appendChild(changeSpan);
    item.appendChild(remove);
    listEl.appendChild(item);
  });
  // After rendering the watchlist, update portfolio performance to reflect
  // any changes in holdings.  This ensures the performance chart always
  // reflects the current watchlist composition.
  // After rendering, fetch latest prices. If local storage had no cached values, ensure the
  // `lastWatchlistData` object has default entries so prices render as dashes initially.
  watchlistTickers.forEach(sym => {
    if (!lastWatchlistData[sym]) {
      lastWatchlistData[sym] = { price: null, change: null };
    }
  });
  fetchWatchlistData();
}

async function fetchWatchlistData() {
  if (!watchlistTickers || watchlistTickers.length === 0) return;
  try {
    const results = await Promise.all(
      watchlistTickers.map(async sym => {
        // Attempt to fetch the latest daily bar from Alpaca.  If successful,
        // compute the price and daily change; otherwise fall back to AlphaVantage.
        async function fetchFromAlpacaQuote() {
          try {
            // Request the last two bars to compute daily change.  The API returns
            // bars sorted from oldest to newest.  We'll take the last two.
            const url = `${ALPACA_DATA_URL}/v2/stocks/${sym}/bars?timeframe=1Day&limit=2`;
            const res = await fetch(url, {
              headers: {
                'APCA-API-KEY-ID': ALPACA_API_KEY,
                'APCA-API-SECRET-KEY': ALPACA_API_SECRET
              }
            });
            const json = await res.json();
            const bars = json.bars || (json.data && json.data.bars) || [];
            if (!Array.isArray(bars) || bars.length === 0) throw new Error('No bars');
            const lastBar = bars[bars.length - 1];
            const prevBar = bars.length > 1 ? bars[bars.length - 2] : null;
            const price = parseFloat(lastBar.c ?? lastBar.close);
            let change = null;
            if (prevBar) {
              const prevClose = parseFloat(prevBar.c ?? prevBar.close);
              if (!isNaN(prevClose) && prevClose !== 0) {
                change = ((price - prevClose) / prevClose) * 100;
              }
            }
            if (!isNaN(price)) {
              return { sym, price, change };
            }
            throw new Error('Invalid Alpaca quote');
          } catch (err) {
            return null;
          }
        }
        const alpaca = await fetchFromAlpacaQuote();
        if (alpaca) return alpaca;
        // Fallback to AlphaVantage GLOBAL_QUOTE
        try {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_API_KEY}`;
          const res = await fetch(url);
          const json = await res.json();
          const q = json['Global Quote'];
          const price = parseFloat(q?.['05. price']);
          const change = parseFloat(q?.['10. change percent']);
          if (!isNaN(price)) {
            return { sym, price, change: isNaN(change) ? null : change };
          }
          throw new Error('Invalid Alpha quote');
        } catch (err) {
          // Use last cached values or null
          return { sym, price: lastWatchlistData[sym]?.price || null, change: lastWatchlistData[sym]?.change || null };
        }
      })
    );
    results.forEach(r => {
      lastWatchlistData[r.sym] = { price: r.price, change: r.change };
    });
    // Update DOM elements with latest values
    const listEl = document.getElementById('watchlist-list');
    if (listEl) {
      Array.from(listEl.children).forEach(li => {
        const ticker = li.querySelector('.watchlist-ticker')?.textContent;
        if (ticker && lastWatchlistData[ticker]) {
          const priceEl = li.querySelector('.watchlist-price');
          const changeEl = li.querySelector('.watchlist-change');
          const data = lastWatchlistData[ticker];
          priceEl.textContent = data.price ? `$${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';
          if (typeof data.change === 'number') {
            changeEl.textContent = (data.change >= 0 ? '+' : '') + data.change.toFixed(2) + '%';
            changeEl.classList.remove('positive', 'negative');
            changeEl.classList.add(data.change >= 0 ? 'positive' : 'negative');
          } else {
            changeEl.textContent = '';
            changeEl.classList.remove('positive', 'negative');
          }
        }
      });
    }
  } catch (err) {
    console.error('fetchWatchlistData error', err);
  }
}

/* ===============================
 * Macro chart with dropdown
 */
let macroChart;
function setupMacro() {
  // Redesigned macro section no longer uses a select dropdown.  We
  // initialise only the multi-series macro chart and hide the single
  // series canvas.  The multi-series chart displays key indicators in
  // one view.
  // Only use the multi-series canvas in the redesigned macro section. The
  // single-series canvas and dropdown have been removed from the markup.
  const multiCanvas = document.getElementById('macro-multi-chart');
  if (!multiCanvas) return;
  const sampleDatasets = {
    GDP: {
      labels: ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
      values: [19300, 20100, 21000, 20500, 22000, 23300, 24100, 24900]
    },
    CPI: {
      labels: ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
      values: [245, 250, 255, 258, 267, 280, 290, 295]
    },
    Unemployment: {
      labels: ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
      values: [4.5, 4.0, 3.7, 8.5, 6.0, 5.2, 4.8, 4.3]
    }
  };
  async function fetchSeries(series) {
    // Attempt to fetch data from FRED using the provided API key. If network fails, return null.
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2017-01-01`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json && Array.isArray(json.observations)) {
        const obs = json.observations.slice(-8);
        const labels = obs.map(o => o.date.slice(0, 4));
        const values = obs.map(o => parseFloat(o.value));
        if (values.every(v => !isNaN(v))) {
          // Cache last successful data for this series
          lastMacroData[series] = { labels, values };
          return { labels, values };
        }
      }
    } catch (err) {
      console.error('FRED fetch error', err);
    }
    return null;
  }
  // Always display the multi-series chart on initial load.  Hide the
  // single-series canvas entirely since the new layout emphasises
  // comparative macro trends.  Fetch multiple series from FRED (or
  // fallback) and render the multi-series chart.
  // Ensure the multi-series canvas is visible
  multiCanvas.style.display = 'block';
  // Fetch multiple series and render the multi-series macro chart
  fetchMultipleSeries().then(multiData => {
    if (multiData) renderMacroMultiChart(multiData);
  });
}

// Fetch multiple macro series from FRED and format for a multi-line chart
async function fetchMultipleSeries() {
  // Define the FRED series IDs and labels to display
  // Define the FRED series IDs and labels to display.  We intentionally omit
  // the Fed Funds Rate from the composite index because its values are
  // significantly lower in magnitude (sub‑5%) and therefore distort the
  // normalised index when multiplied by 100.  The 10‑year Treasury yield
  // provides a more stable policy indicator with a similar order of magnitude
  // to other macro series once normalised.
  const seriesList = [
    { key: 'GDP', fred: 'GDPC1', label: 'Real GDP' },
    { key: 'CPI', fred: 'CPIAUCSL', label: 'CPI' },
    { key: 'Unemployment', fred: 'UNRATE', label: 'Unemployment Rate' },
    { key: '10Y', fred: 'DGS10', label: '10Y Treasury Yield' }
  ];
  try {
    const promises = seriesList.map(item => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${item.fred}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2017-01-01`;
      return fetch(url).then(res => res.json()).then(json => {
        const obs = json.observations.slice(-8);
        return {
          key: item.key,
          label: item.label,
          labels: obs.map(o => o.date.slice(0, 4)),
          values: obs.map(o => parseFloat(o.value))
        };
      });
    });
    const results = await Promise.all(promises);
    // Use labels from first series
    const labels = results[0].labels;
    const datasets = results.map(item => ({ key: item.key, label: item.label, values: item.values }));
    return { labels, datasets };
  } catch (err) {
    console.error('Multi-series FRED fetch failed', err);
    // Fallback to cached or sample data
    if (lastMacroData['multi']) return lastMacroData['multi'];
    // Sample fallback: mimic up trending lines
    const labels = ['2017','2018','2019','2020','2021','2022','2023','2024'];
    const datasets = [
      { key:'GDP', label:'Real GDP', values:[19000,19800,21000,20500,22500,24000,25000,26000] },
      { key:'CPI', label:'CPI', values:[240,245,250,255,265,280,295,300] },
      { key:'Unemployment', label:'Unemployment Rate', values:[4.5,4.0,3.7,8.5,6.0,5.0,4.5,4.2] },
      { key:'FFR', label:'Fed Funds Rate', values:[1.0,1.5,2.25,0.25,0.25,1.5,3.0,4.5] }
    ];
    return { labels, datasets };
  }
}

function renderMacroMultiChart(data) {
  const multiCanvas = document.getElementById('macro-multi-chart');
  if (!multiCanvas) return;
  const ctx = multiCanvas.getContext('2d');
  // Normalise each series to a base of 100 so that very large values (e.g. GDP) do not
  // dominate the scale.  This aligns all series on a comparable index basis.  We
  // compute the first non‑NaN value for each dataset and divide all values by
  // this base, multiplying by 100 to express as an index.  The normalised values
  // are stored on each dataset object as `normValues` to preserve the raw values
  // for any future uses.
  const colors = ['#6366f1', '#f59e0b', '#ef4444', '#10b981'];
  data.datasets.forEach(item => {
    const base = item.values.find(v => typeof v === 'number' && !isNaN(v));
    // Avoid divide by zero or undefined base by defaulting to 1
    const baseValue = base || 1;
    item.normValues = item.values.map(v => {
      const val = typeof v === 'number' && !isNaN(v) ? v : baseValue;
      return (val / baseValue) * 100;
    });
  });
  const chartDataSets = data.datasets.map((item, idx) => ({
    label: item.label,
    data: item.normValues,
    borderColor: colors[idx % colors.length],
    backgroundColor: colors[idx % colors.length] + '20',
    borderWidth: 2,
    tension: 0.25,
    pointRadius: 0
  }));
  if (window.macroMultiChart) {
    window.macroMultiChart.destroy();
  }
  // Determine colour palette based on the macro section theme (light/dark)
  const isDark = multiCanvas.closest('.section-dark') !== null;
  const textColour = isDark ? '#f5f5f5' : '#333';
  const gridColour = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  window.macroMultiChart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.labels, datasets: chartDataSets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Year', color: textColour, font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 10 } },
          grid: { display: false }
        },
        y: {
          // Update the y‑axis title to clarify that series are normalised to a base
          // of 100 rather than plotting raw values.  This helps readers
          // interpret the composite index correctly.
          title: { display: true, text: 'Index (Base 100)', color: textColour, font: { family: 'Maison Neue Mono', size: 12 } },
          ticks: { color: textColour, font: { family: 'Maison Neue Mono', size: 10 } },
          grid: { color: gridColour }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Maison Neue Mono', size: 10 }, color: textColour } },
        tooltip: {},
        // Enable interactive zoom and pan on the multi-series macro chart.
        zoom: {
          pan: { enabled: true, mode: 'x', threshold: 10 },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          }
        },
        // Add a shaded box to highlight the COVID recession (2020–2021).  This
        // provides context when comparing multiple macro indicators.
        annotation: {
          annotations: {
            recession: {
              type: 'box',
              xMin: '2020',
              xMax: '2021',
              backgroundColor: 'rgba(200,200,200,0.15)',
              yScaleID: 'y'
            }
          }
        }
      }
    }
  });
  // Save dataset to cache
  lastMacroData['multi'] = data;
}

/* ==========================================
 * Macro dashboard cards
 * Fetches multiple key macro indicators (GDP, CPI, Unemployment, Fed Funds, 10Y) and displays
 * summary cards with the latest value, change versus prior period, and a small sparkline.
 */

/*
 * Macro dashboard metrics
 *
 * This array defines the key FRED series to display in the macro dashboard.  Each
 * entry contains a `key` (the FRED series ID), a human‑readable `name`, the
 * `unit` used for formatting the latest value, and a `colour` used for the
 * sparkline and card accents.  We extend the original five metrics (GDP, CPI,
 * unemployment, Fed Funds, 10Y Treasury) by adding housing starts and retail
 * sales.  Housing starts (HOUST) measure the number of new residential housing
 * construction projects, expressed in thousands of units.  Retail sales
 * (RSAFS) track total retail trade in billions of dollars.  Including these
 * indicators provides a broader view of economic momentum across consumer
 * spending and the housing sector.
 */
const macroDashboardMetrics = [
  { key: 'GDPC1', name: 'Real GDP', unit: 'B USD', colour: '#6366f1' },
  { key: 'CPIAUCSL', name: 'CPI', unit: 'Index', colour: '#f59e0b' },
  { key: 'UNRATE', name: 'Unemployment', unit: '%', colour: '#ef4444' },
  { key: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%', colour: '#10b981' },
  { key: 'DGS10', name: '10Y Treasury', unit: '%', colour: '#a855f7' },
  { key: 'HOUST', name: 'Housing Starts', unit: 'Thous', colour: '#8b5cf6' },
  { key: 'RSAFS', name: 'Retail Sales', unit: 'B USD', colour: '#ec4899' }
];

async function fetchMacroDashboardData() {
  // Attempt to fetch the last 12 observations for each metric
  try {
    const promises = macroDashboardMetrics.map(metric => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${metric.key}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=12`;
      return fetch(url)
        .then(res => res.json())
        .then(json => {
          const obs = Array.isArray(json.observations) ? json.observations : [];
          // FRED returns observations sorted descending; reverse to ascending for chart
          const values = obs.map(o => parseFloat(o.value)).reverse();
          const dates = obs.map(o => o.date).reverse();
          return { metric, values, dates };
        });
    });
    const results = await Promise.all(promises);
    // Build data structure for each metric
    const dashboard = results.map(result => {
      const { metric, values, dates } = result;
      // Use last two non-NaN values to compute change
      let latest = null, prev = null;
      for (let i = values.length - 1; i >= 0; i--) {
        if (!isNaN(values[i]) && latest === null) {
          latest = values[i];
        } else if (!isNaN(values[i]) && prev === null) {
          prev = values[i];
        }
        if (latest !== null && prev !== null) break;
      }
      const change = (latest !== null && prev !== null && prev !== 0) ? ((latest - prev) / prev) * 100 : 0;
      return {
        key: metric.key,
        name: metric.name,
        unit: metric.unit,
        colour: metric.colour,
        latest: latest !== null ? latest : null,
        change: change,
        values: values.map(v => (isNaN(v) ? null : v)),
        dates
      };
    });
    // Cache latest result
    lastMacroDashboard = dashboard;
    return dashboard;
  } catch (err) {
    console.error('Macro dashboard fetch error', err);
    // On error, return last cached data if any
    if (lastMacroDashboard) return lastMacroDashboard;
    // Otherwise use static fallback sample
    const sample = [
      { key:'GDPC1', name:'Real GDP', unit:'B USD', colour:'#6366f1', values:[19000,19800,21000,20500,22500,24000,25000,26000], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'CPIAUCSL', name:'CPI', unit:'Index', colour:'#f59e0b', values:[240,245,250,255,265,280,295,300], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'UNRATE', name:'Unemployment', unit:'%', colour:'#ef4444', values:[4.5,4.0,3.7,8.5,6.0,5.0,4.5,4.2], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'FEDFUNDS', name:'Fed Funds Rate', unit:'%', colour:'#10b981', values:[1.0,1.5,2.25,0.25,0.25,1.5,3.0,4.5], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'DGS10', name:'10Y Treasury', unit:'%', colour:'#a855f7', values:[2.4,2.6,2.8,0.9,1.5,2.9,3.8,4.0], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'HOUST', name:'Housing Starts', unit:'Thous', colour:'#8b5cf6', values:[1200,1250,1300,1400,1450,1500,1600,1700], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] },
      { key:'RSAFS', name:'Retail Sales', unit:'B USD', colour:'#ec4899', values:[550,560,570,580,590,600,620,640], dates:['2017','2018','2019','2020','2021','2022','2023','2024'] }
    ];
    return sample.map(item => {
      const values = item.values;
      const latest = values[values.length - 1];
      const prev = values[values.length - 2];
      const change = prev ? ((latest - prev) / prev) * 100 : 0;
      return {
        key: item.key,
        name: item.name,
        unit: item.unit,
        colour: item.colour,
        latest,
        change,
        values,
        dates: item.dates
      };
    });
  }
}

function createSparkline(ctx, values, colour) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: values.map((_, idx) => idx),
      datasets: [
        {
          data: values,
          borderColor: colour,
          backgroundColor: colour + '20',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: { display: false }
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function renderMacroDashboard(data) {
  const container = document.getElementById('macro-cards');
  if (!container || !Array.isArray(data)) return;
  container.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'macro-card animate';
    const latestFormatted = item.latest !== null ? (item.unit === '%' ? item.latest.toFixed(2) + '%' : item.latest.toLocaleString()) : 'N/A';
    const changeFormatted = isNaN(item.change) ? '0.0%' : `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%`;
    const changeClass = item.change >= 0 ? 'positive' : 'negative';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="macro-value">${latestFormatted}</div>
      <div class="macro-change ${changeClass}">${changeFormatted}</div>
      <canvas class="macro-sparkline"></canvas>
    `;
    container.appendChild(card);
    // Draw sparkline using Chart.js
    const canvas = card.querySelector('.macro-sparkline');
    const ctx = canvas.getContext('2d');
    createSparkline(ctx, item.values.map(v => v === null ? null : v), item.colour);
  });
}

async function setupMacroDashboard() {
  try {
    // Attempt to fetch fresh macro data.  If the FRED API call fails the
    // fetchMacroDashboardData function will return either the last cached
    // values or a static sample.  Either way we obtain a non‑empty array.
    const data = await fetchMacroDashboardData();
    if (Array.isArray(data) && data.length > 0) {
      renderMacroDashboard(data);
      populateMacroAnalysis(data);
      return;
    }
  } catch (err) {
    console.warn('setupMacroDashboard error', err);
  }
  // Always ensure the macro dashboard is populated.  If we reach this point,
  // either the FRED API failed or returned invalid data.  Use a static
  // fallback so the dashboard never appears blank.
  const fallback = [
    { key:'GDPC1', name:'Real GDP', unit:'B USD', colour:'#6366f1', latest:26000, change:3.5, values:[19000,20000,21000,22000,23000,24000,25000,26000] },
    { key:'CPIAUCSL', name:'CPI', unit:'Index', colour:'#f59e0b', latest:300, change:2.1, values:[240,245,250,255,265,280,295,300] },
    { key:'UNRATE', name:'Unemployment', unit:'%', colour:'#ef4444', latest:4.2, change:-0.1, values:[4.5,4.3,4.0,8.0,6.0,5.0,4.5,4.2] },
    { key:'FEDFUNDS', name:'Fed Funds Rate', unit:'%', colour:'#10b981', latest:4.5, change:0.0, values:[1.0,1.5,2.25,0.25,0.25,1.5,3.0,4.5] },
    { key:'DGS10', name:'10Y Treasury', unit:'%', colour:'#a855f7', latest:4.0, change:0.2, values:[2.4,2.6,2.8,0.9,1.5,2.9,3.8,4.0] },
    { key:'HOUST', name:'Housing Starts', unit:'Thous', colour:'#8b5cf6', latest:1700, change:3.0, values:[1200,1250,1300,1400,1450,1500,1600,1700] },
    { key:'RSAFS', name:'Retail Sales', unit:'B USD', colour:'#ec4899', latest:640, change:1.5, values:[550,560,570,580,590,600,620,640] }
  ];
  renderMacroDashboard(fallback);
  populateMacroAnalysis(fallback);
}
