export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'API is working', method: 'GET' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { description, contentType, audience, platform } = req.body || {};

    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `You are a social media content creator for Fountain Vitality, a TRT (testosterone replacement therapy) and HRT (hormone replacement therapy) clinic. 

Your brand voice is:
- Friendly and approachable (never clinical or intimidating)
- Empathetic and understanding
- Educational but not overwhelming
- Empowering and hopeful

IMPORTANT RULES:
- Never mention sexual performance explicitly
- Focus on energy, clarity, mood, vitality, and quality of life
- Use relatable, conversational language
- Include emojis appropriately
- End with a clear call-to-action

Target Audience: ${audience === 'men' ? 'Men (30s-40s) interested in TRT' : audience === 'women' ? 'Women (45-55) going through perimenopause/menopause' : 'General audience interested in hormone health'}

Content Type: ${contentType === 'educational' ? 'Educational content that teaches about hormones and symptoms' : contentType === 'mythBusting' ? 'Myth-busting content that corrects misconceptions' : 'Testimonial-style content showcasing transformations and success stories'}

Platform: ${platform} (optimize length and style for this platform)`;

    const userPrompt = `Based on this content/image description: "${description}"

Generate:
1. A compelling HOOK (1-2 sentences that grab attention, end with a colon)
2. A full CAPTION (150-250 words, formatted with line breaks and arrows/bullets, ending with a CTA)

Format your response EXACTLY like this:
HOOK: [Your hook here]

CAPTION: [Your caption here]`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            return res.status(500).json({ error: 'Failed to generate content' });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        const hookMatch = content.match(/HOOK:\s*([\s\S]*?)(?=\n\nCAPTION:|$)/i);
        const captionMatch = content.match(/CAPTION:\s*([\s\S]*?)$/i);

        const hook = hookMatch ? hookMatch[1].trim() : content.split('\n')[0];
        const caption = captionMatch ? captionMatch[1].trim() : content;

        return res.status(200).json({
            hook,
            caption,
            success: true
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
