const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

const SEQERA_API = 'https://api.cloud.seqera.io';

// Proxy all Seqera API requests
app.all('/api/*', async (req, res) => {
  try {
    const seqeraPath = req.path.replace('/api', '');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const url = `${SEQERA_API}${seqeraPath}${queryString}`;
    
    console.log(`\n📤 Proxying ${req.method} ${url}`);
    
    const token = req.headers['x-seqera-token'];
    if (!token) {
      console.error('❌ Missing Seqera token');
      console.error('📋 Available headers:', Object.keys(req.headers));
      return res.status(401).json({ error: 'Missing Seqera token' });
    }

    console.log(`🔑 Using token: ${token.substring(0, 20)}...`);

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
      console.log(`📦 Request body:`, req.body);
    }

    console.log(`📡 Sending request to Seqera...`);
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response content-type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Error response:`, JSON.stringify(data, null, 2));
      } else {
        console.log(`✅ Success - returned ${JSON.stringify(data).length} bytes`);
      }
      
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        console.error(`❌ Error response (text):`, text);
      }
      
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Serve React app for all other routes (MUST BE LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Proxy server running on port ${PORT}`);
  console.log(`📡 Forwarding requests to ${SEQERA_API}`);
  console.log(`🔧 Node version: ${process.version}\n`);
});