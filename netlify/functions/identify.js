exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image_base64 } = JSON.parse(event.body);

    if (!image_base64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
    }

    const prompt = `Tu es un expert botaniste. Analyse cette photo et réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après, juste le JSON brut :
{"nom":"nom commun français","nom_latin":"nom latin","type":"interieur","espece":"monstera","arrosage_jours":7,"notes":"conseil 1. conseil 2."}

Les valeurs possibles pour type : interieur, exterieur, arbre, potager, petits-fruits, semis
Les valeurs possibles pour espece : olivier, figuier, citronnier, pommier, poirier, cerisier, prunier, framboisier, cassissier, groseillier, fraisier, lavande, chevrefeuille, rose, hydrangea, tomate, courgette, haricot, salade, carotte, poivron, basilic, monstera, pothos, ficus, orchidee, succulente, fougere, calathea, autre`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image_base64
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || 'API error ' + response.status })
      };
    }

    if (!data.content || !data.content[0]) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Empty response' }) };
    }

    let text = data.content[0].text.trim();
    text = text.replace(/```json|```/g, '').trim();

    JSON.parse(text); // Validate

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
