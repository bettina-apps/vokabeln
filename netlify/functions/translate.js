const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { word, pos, definition } = JSON.parse(event.body || '{}');
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key missing' }) };
  }

  // Build a context-aware text for DeepL
  // We translate the word itself, with context from definition
  const textToTranslate = word;

  try {
    const result = await deepLTranslate(textToTranslate, apiKey, definition);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translation: result })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function deepLTranslate(text, apiKey, context) {
  return new Promise((resolve, reject) => {
    const isFreeKey = apiKey.endsWith(':fx');
    const host = isFreeKey ? 'api-free.deepl.com' : 'api.deepl.com';

    const params = new URLSearchParams({
      text: text,
      source_lang: 'EN',
      target_lang: 'DE'
    });

    // Add context if available (improves translation accuracy)
    if (context) {
      params.append('context', context);
    }

    const postData = params.toString();

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
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.translations && json.translations[0]) {
            resolve(json.translations[0].text);
          } else {
            reject(new Error('No translation returned: ' + data));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
