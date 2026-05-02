exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const image_base64 = body.image_base64;

    if (!image_base64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No API key' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 400,
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
            {
              type: 'text',
              text: 'Identifie cette plante. Réponds UNIQUEMENT avec ce JSON sans markdown:\n{"nom":"nom français","nom_latin":"latin","type":"interieur","espece":"autre","arrosage_jours":7,"notes":"conseil court"}\nPour type utilise: interieur, exterieur, arbre, potager, petits-fruits, semis\nPour espece utilise: olivier, figuier, citronnier, pommier, poirier, cerisier, prunier, framboisier, cassissier, groseillier, fraisier, lavande, chevrefeuille, rose, hydrangea, tomate, courgette, haricot, salade, carotte, poivron, basilic, monstera, pothos, ficus, orchidee, succulente, fougere, calathea, autre'
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: JSON.stringify(data.error) })
      };
    }

    let text = data.content[0].text.trim();
    text = text.replace(/```json|```/g, '').trim();

    // Extract JSON if there's text around it
    const match = text.match(/\{[\s\S]*\}/);
    if (match) text = match[0];

    JSON.parse(text); // validate

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
