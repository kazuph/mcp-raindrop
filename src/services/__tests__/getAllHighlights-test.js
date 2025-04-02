import axios from 'axios';
import config from '../../config/config.js';

async function testRaindropAPI() {
  const api = axios.create({
    baseURL: 'https://api.raindrop.io/rest/v1',
    headers: {
      Authorization: `Bearer ${config.raindropAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Test different endpoints
    const userHighlightsResponse = await api.get('/user/highlights');
    console.log('User Highlights Response:', JSON.stringify(userHighlightsResponse.data, null, 2));

    const highlightsResponse = await api.get('/highlights');
    console.log('Highlights Response:', JSON.stringify(highlightsResponse.data, null, 2));
  } catch (error) {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
  }
}

testRaindropAPI();