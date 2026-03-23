exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { word, pos, definition } = JSON.parse(event.body || '{}');
  if (!word) return { statusCode: 400, body: 'Missing word' };

  const prompt = `Translate the English word "${word}" (part of speech: ${pos || 'unknown'}, meaning: "${definition || ''}") into German.

Return ALL common German translations, separated by commas.
- For nouns: capitalize (e.g. "Göre, Balg, Fratz")
- For verbs: infinitive, lowercase (e.g. "bellen, kläffen")
- For adjectives/adverbs: lowercase
- Include synonyms and regional variants where relevant
- Maximum 6 translations
- ONLY the German words, no explanations, no numbering`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const translation = data?.content?.[0]?.text?.trim() || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translation })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
