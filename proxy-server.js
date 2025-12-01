// Simple proxy server to avoid CORS issues
// Run this with: node proxy-server.js
// Requires Node.js 18+ (uses native fetch)

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const SEQERA_API = 'https://api.cloud.seqera.io';

// Proxy image requests (for pipeline icons - 40px x 40px)
app.get('/image/*', async (req, res) => {
  try {
    const imagePath = req.path.replace('/image', '');
    const url = `${SEQERA_API}${imagePath}`;
    
    console.log(`\n🖼️  Proxying image: ${url}`);
    
    const token = req.query.token;
    if (!token) {
      console.error('❌ Missing token for image request');
      return res.status(401).send('Missing token');
    }

    console.log(`🔑 Using token: ${token.substring(0, 20)}...`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`📥 Image response status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Image fetch failed: ${response.status}`);
      console.error(`❌ Error body:`, errorText);
      return res.status(response.status).send('Image fetch failed');
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();
    
    console.log(`✅ Image fetched (${contentType}, ${imageBuffer.byteLength} bytes)`);
    
    res.set('Content-Type', contentType);
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).send('Image proxy error');
  }
});

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
      return res.status(401).json({ error: 'Missing Seqera token' });
    }

    console.log(`🔑 Token: ${token.substring(0, 20)}...`);

    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
      console.log(`📦 Body:`, req.body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Log error responses for debugging
      if (!response.ok) {
        console.error(`❌ Error response:`, JSON.stringify(data, null, 2));
      } else {
        console.log(`✅ Success`);
      }
      
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        console.error(`❌ Error response (text):`, text);
      }
      
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Forwarding requests to ${SEQERA_API}`);
  console.log(`🔧 Node version: ${process.version}\n`);
});