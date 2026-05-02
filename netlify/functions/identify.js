exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image_base64, month } = JSON.parse(event.body);

    const prompt = `Tu es un expert botaniste et horticulteur. Analyse cette photo de plante et réponds UNIQUEMENT en JSON valide avec cette structure exacte (sans markdown, sans backticks, sans texte avant ou après) :
{
  "nom": "nom commun en français",
  "nom_latin": "nom latin scientifique",
  "type": "interieur ou exterieur ou arbre ou potager ou petits-fruits ou semis",
  "espece": "une de ces valeurs exactes si applicable: olivier, figuier, citronnier, pommier, poirier, cerisier, prunier, framboisier, cassissier, groseillier, fraisier, lavande, chevrefeuille, rose, hydrangea, tomate, courgette, haricot, salade, carotte, poivron, concombre, basilic, persil, monstera, pothos, ficus, orchidee, succulente, fougere, calathea, autre",
  "arrosage_jours": 7,
  "notes": "2-3 conseils essentiels courts sur cette plante"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
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

    if (!data.content || !data.content[0]) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from Claude' })
      };
    }

    let text = data.content[0].text.trim();
    text = text.replace(/```json|```/g, '').trim();

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
