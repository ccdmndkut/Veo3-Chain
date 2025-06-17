/*
Purpose: Script generation module using OpenAI API
Converts user character and story prompt into 3 detailed scene scripts for Veo3 API
*/

const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate 3 scene scripts from character and story prompt
 * @param {string} character - The main character (e.g., "stormtrooper")
 * @param {string} prompt - User's story prompt
 * @returns {Promise<string[]>} Array of 3 scene scripts
 */
async function generateSceneScripts(character, prompt) {
    const systemPrompt = `You are a script writer specializing in short-form video content. Your task is to take a character and story prompt, then create exactly 3 detailed scene descriptions for 8-second video clips.

Requirements:
- Each scene must be exactly one paragraph
- Each scene must prominently feature the same character throughout
- Scenes should flow logically to create a cohesive 24-second story
- Each scene should be visually interesting and suitable for AI video generation
- Include camera angles, lighting, and visual details
- Keep the character consistent across all scenes

Format your response as a JSON array with exactly 3 strings, each being a complete scene description.`;

    const userPrompt = `Character: ${character}
Story prompt: ${prompt}

Please create 3 scene scripts that tell a complete story featuring this character.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content.trim();
        
        // Try to parse JSON response
        let scripts;
        try {
            scripts = JSON.parse(content);
        } catch (parseError) {
            // If JSON parsing fails, try to extract scripts manually
            console.warn('Failed to parse JSON, attempting manual extraction');
            scripts = extractScriptsFromText(content);
        }

        // Validate we have exactly 3 scripts
        if (!Array.isArray(scripts) || scripts.length !== 3) {
            throw new Error(`Expected 3 scripts, got ${scripts ? scripts.length : 0}`);
        }

        // Add character consistency to each script
        const enhancedScripts = scripts.map((script, index) => {
            const sceneNumber = index + 1;
            return `Scene ${sceneNumber}: ${script}. The ${character} maintains consistent appearance and costume throughout this scene.`;
        });

        console.log('Generated scripts:', enhancedScripts);
        return enhancedScripts;

    } catch (error) {
        console.error('Error generating scripts:', error);
        
        // Fallback to predefined templates if API fails
        console.log('Using fallback template scripts');
        return generateFallbackScripts(character, prompt);
    }
}

/**
 * Extract scripts from plain text if JSON parsing fails
 * @param {string} text - Raw text response
 * @returns {string[]} Array of extracted scripts
 */
function extractScriptsFromText(text) {
    // Look for numbered scenes or bullet points
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const scripts = [];
    
    for (const line of lines) {
        if (line.match(/^\d+\./) || line.match(/^Scene \d+/) || line.match(/^-/)) {
            const cleaned = line.replace(/^\d+\./, '').replace(/^Scene \d+:/, '').replace(/^-/, '').trim();
            if (cleaned.length > 20) { // Ensure it's a substantial description
                scripts.push(cleaned);
            }
        }
    }
    
    return scripts.slice(0, 3); // Take only first 3
}

/**
 * Generate fallback scripts when API fails
 * @param {string} character - The main character
 * @param {string} prompt - User's story prompt
 * @returns {string[]} Array of 3 fallback scripts
 */
function generateFallbackScripts(character, prompt) {
    return [
        `Scene 1: A ${character} stands in a bright, bustling environment, looking directly at the camera with confidence. The lighting is warm and inviting, with soft shadows creating depth. The ${character} maintains their iconic appearance and costume.`,
        
        `Scene 2: The same ${character} is now in a more intimate setting, perhaps sitting or leaning casually while gesturing expressively. The scene has a cozy, personal atmosphere with soft lighting. The ${character} maintains consistent appearance and costume throughout this scene.`,
        
        `Scene 3: The ${character} concludes their story in a dramatic or peaceful setting, with beautiful background lighting creating a cinematic finale. The mood is reflective and satisfying. The ${character} maintains consistent appearance and costume throughout this scene.`
    ];
}

module.exports = {
    generateSceneScripts
}; 