const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let word, pos, definition;
  try {
    const body = JSON.parse(event.body || '{}');
    word = body.word; pos = body.pos; definition = body.definition;
  } catch(e) {
    return { statusCode: 400, body: 'Bad request' };
  }

  if (!word) return { statusCode: 400, body: 'Missing word' };

  const prompt = `Translate the English word "${word}" (part of speech: ${pos || 'unknown'}, meaning: "${definition || ''}") into German.\n\nReturn ALL common German translations, separated by commas.\n- For nouns: capitalize (e.g. "Göre, Balg, Fratz")\n- For verbs: infinitive, lowercase (e.g. "bellen, kläffen")\n- For adjectives/adverbs: lowercase\n- Include synonyms and regional variants where relevant\n- Maximum 6 translations\n- ONLY the German words, no explanations, no numbering`;

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const translation = parsed?.content?.[0]?.text?.trim() || '';
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ translation })
          });
        } catch(e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Parse error', raw: data }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(requestBody);
    req.end();
  });
};
