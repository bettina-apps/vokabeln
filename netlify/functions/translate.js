const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { word, definition } = body;
    const apiKey = process.env.DEEPL_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: 'FEHLER: DEEPL_API_KEY fehlt' })
      };
    }

    const isFreeKey = apiKey.endsWith(':fx');
    const host = isFreeKey ? 'api-free.deepl.com' : 'api.deepl.com';

    const params = new URLSearchParams({ text: word, source_lang: 'EN', target_lang: 'DE' });
    if (definition) params.append('context', definition);
    const postData = params.toString();

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        path: '/v2/translate',
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', err => reject(err));
      req.write(postData);
      req.end();
    });

    if (result.status !== 200) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: `DEEPL FEHLER ${result.status}: ${result.data}` })
      };
    }

    const json = JSON.parse(result.data);
    const translation = json.translations?.[0]?.text || 'keine Übersetzung';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translation })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translation: `EXCEPTION: ${err.message}` })
    };
  }
};
