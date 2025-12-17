const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const SEQERA_API = 'https://api.cloud.seqera.io';

// Benchling lifecycle endpoints
app.post('/lifecycle', (req, res) => {
  console.log('📱 Lifecycle event:', req.body);
  res.status(200).json({ success: true });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Image proxy
app.get('/image/*', async (req, res) => {
  try {
    const imagePath = req.path.replace('/image', '');
    const url = `${SEQERA_API}${imagePath}`;
    const token = req.query.token;
    
    if (!token) return res.status(401).send('Missing token');

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return res.status(response.status).send('Image fetch failed');

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();
    
    res.set('Content-Type', contentType);
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).send('Image proxy error');
  }
});

// API proxy
app.all('/api/*', async (req, res) => {
  try {
    const seqeraPath = req.path.replace('/api', '');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const url = `${SEQERA_API}${seqeraPath}${queryString}`;
    
    const token = req.headers['x-seqera-token'];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Static files and catch-all
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});