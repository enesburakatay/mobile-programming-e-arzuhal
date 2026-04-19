const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

// Import route modules
const authRoutes = require('./routes/auth');
const contractRoutes = require('./routes/contracts');
const userRoutes = require('./routes/users');
const verificationRoutes = require('./routes/verification');
const chatRoutes = require('./routes/chat');
const analysisRoutes = require('./routes/analysis');
const disclaimerRoutes = require('./routes/disclaimer');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/users', userRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/disclaimer', disclaimerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Endpoint bulunamadı: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Sunucu hatası oluştu.' });
});

// ── Start ───────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  e-Arzuhal Main Server`);
      console.log(`  ─────────────────────`);
      console.log(`  Port:     ${PORT}`);
      console.log(`  Database: PostgreSQL (mobile_programming)`);
      console.log(`  URL:      http://localhost:${PORT}`);
      console.log(`  Health:   http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
