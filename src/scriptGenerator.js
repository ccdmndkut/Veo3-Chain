/*
Purpose: Script generation module using OpenAI API
Converts user character and story prompt into 3 detailed scene scripts optimized for Veo3 API
*/

const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Veo3 Character Bible - Detailed character descriptions for consistency
 */
const CHARACTER_BIBLE = {
    stormtrooper: {
        description: "A classic Imperial Stormtrooper with gleaming white armor plating, distinctive black eye lenses in the helmet, utility belt with equipment pouches, and the iconic angular helmet design. The armor shows subtle battle-worn details and reflective surfaces.",
        voice: "speaks with a clear, authoritative voice slightly muffled by the helmet",
        mannerisms: "stands with military posture, gestures with precision"
    },
    wizard: {
        description: "An elderly wizard with a long, flowing grey beard reaching his chest, wearing deep purple robes with silver embroidered stars, a pointed hat with a wide brim, and carrying a gnarled wooden staff topped with a glowing crystal. His eyes are wise and twinkling blue.",
        voice: "speaks with a warm, deep voice filled with ancient wisdom",
        mannerisms: "gestures gracefully with weathered hands, strokes his beard thoughtfully"
    },
    detective: {
        description: "A seasoned detective in his 40s with short brown hair, wearing a rumpled beige trench coat over a white shirt and dark tie, with a fedora hat and worn leather shoes. He has a weathered face with sharp, observant eyes and a slight five o'clock shadow.",
        voice: "speaks with a gravelly, world-weary voice",
        mannerisms: "adjusts his hat brim, takes notes in a small notebook"
    },
    chef: {
        description: "A professional chef wearing a pristine white double-breasted chef's coat with black buttons, a traditional white toque blanche (chef's hat), black and white checkered pants, and black non-slip shoes. Has flour-dusted hands and carries a wooden spoon.",
        voice: "speaks with passionate enthusiasm about food",
        mannerisms: "tastes food with a spoon, wipes hands on apron towel"
    },
    astronaut: {
        description: "A modern astronaut wearing a sleek white spacesuit with NASA patches, reflective gold visor on the helmet, life support backpack with glowing status lights, and reinforced boots. The suit has subtle blue LED accents and mission patches.",
        voice: "speaks with clear, professional tone through helmet comm system",
        mannerisms: "checks wrist display panels, moves with careful precision"
    },
    pirate: {
        description: "A swashbuckling pirate captain with a tricorn hat adorned with a feather, weathered brown leather coat over a white shirt, black boots, and a red sash around the waist. Has a neatly trimmed black beard and carries a cutlass at the hip.",
        voice: "speaks with a hearty, adventurous accent",
        mannerisms: "adjusts tricorn hat, gestures broadly with weathered hands"
    }
};

/**
 * Generate Veo3-optimized character description
 */
function getCharacterDescription(character) {
    const characterData = CHARACTER_BIBLE[character];
    if (characterData) {
        return characterData.description;
    }
    return `A ${character} with distinctive, consistent appearance and costume throughout all scenes`;
}

/**
 * Extract JSON from a text response using OpenAI
 * @param {string} text - The text response that should contain JSON
 * @returns {Promise<string[]>} Array of extracted scripts
 */
async function extractJSONWithAPI(text) {
    console.log('🔧 Using API to extract JSON from response...');
    
    const extractionPrompt = `Extract exactly 3 scene descriptions from the following text and return them as a clean JSON array with 3 strings.

Text to extract from:
${text}

Return ONLY the JSON array, nothing else:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a JSON extraction tool. Return only valid JSON arrays.' },
                { role: 'user', content: extractionPrompt }
            ],
            temperature: 0.1,
            max_tokens: 2000,
        });

        const content = response.choices[0].message.content.trim();
        const scripts = JSON.parse(content);
        
        if (Array.isArray(scripts) && scripts.length === 3) {
            console.log('✅ Successfully extracted JSON with API');
            return scripts;
        } else {
            throw new Error(`Expected 3 scripts, got ${scripts.length}`);
        }
        
    } catch (error) {
        console.error('❌ API extraction failed:', error);
        throw error;
    }
}

/**
 * Generate 3 scene scripts from character and story prompt using Veo3 best practices
 * @param {string} character - The main character (e.g., "stormtrooper")
 * @param {string} prompt - User's story prompt
 * @returns {Promise<string[]>} Array of 3 Veo3-optimized scene scripts
 */
async function generateSceneScripts(character, prompt) {
    const characterDesc = getCharacterDescription(character);
    const characterData = CHARACTER_BIBLE[character];
    
    const systemPrompt = `You are an expert Veo3 prompt engineer specializing in creating optimal prompts for Google's Veo3 video generation AI. 

CRITICAL VEO3 OPTIMIZATION RULES:
1. CHARACTER CONSISTENCY: Use the EXACT same character description in each scene
2. STRUCTURE: Follow this exact format for each scene:
   - Subject: [Detailed character description]
   - Context: [Specific setting/environment]
   - Action: [Precise action/movement]
   - Camera Motion: [Specific camera movement]
   - Composition: [Shot framing]
   - Style: [Visual aesthetic]
   - Ambiance: [Lighting/mood]
   - Audio: [Sound effects and dialogue]

3. CAMERA MOVEMENTS: Use cinematic terms like "dolly in", "tracking shot", "pan left", "crane shot", "close-up", "medium shot", "wide shot"
4. AUDIO: Always include specific sound effects, ambient noise, and dialogue instructions
5. AVOID: Never use "no" or "don't" - describe what you WANT to see
6. DIALOGUE: Format as 'Character says: "dialogue text" (no subtitles!)'
7. CONSISTENCY: Repeat the exact character description verbatim in each scene

Create exactly 3 scenes that flow as a cohesive story. Each scene must be one detailed paragraph optimized for Veo3.

IMPORTANT: Return ONLY a JSON array with 3 strings. No other text.

Format as JSON array with 3 strings.`;

    const userPrompt = `Character: ${character}
Character Description: ${characterDesc}
${characterData ? `Voice: ${characterData.voice}, Mannerisms: ${characterData.mannerisms}` : ''}

Story Prompt: ${prompt}

Create 3 Veo3-optimized scene scripts following the structure above. Return only the JSON array.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
        });

        const content = response.choices[0].message.content.trim();
        
        // Try to parse JSON response
        let scripts;
        try {
            scripts = JSON.parse(content);
        } catch (parseError) {
            console.warn('Failed to parse JSON, using API extraction...');
            // Use API to extract JSON instead of manual extraction
            scripts = await extractJSONWithAPI(content);
        }

        // Validate we have exactly 3 scripts
        if (!Array.isArray(scripts) || scripts.length !== 3) {
            throw new Error(`Expected 3 scripts, got ${scripts ? scripts.length : 0}`);
        }

        // Ensure character consistency in each script
        const enhancedScripts = scripts.map((script, index) => {
            const sceneNumber = index + 1;
            // Ensure the character description is at the beginning of each script
            if (!script.includes(characterDesc)) {
                return `${characterDesc}. ${script}`;
            }
            return script;
        });

        console.log('Generated Veo3-optimized scripts:', enhancedScripts);
        return enhancedScripts;

    } catch (error) {
        console.error('Error generating scripts:', error);
        
        // Fallback to Veo3-optimized templates if API fails
        console.log('Using Veo3-optimized fallback template scripts');
        return generateVeo3FallbackScripts(character, prompt);
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
            if (cleaned.length > 50) { // Ensure it's a substantial Veo3-optimized description
                scripts.push(cleaned);
            }
        }
    }
    
    return scripts.slice(0, 3); // Take only first 3
}

/**
 * Generate Veo3-optimized fallback scripts when API fails
 * @param {string} character - The main character
 * @param {string} prompt - User's story prompt
 * @returns {string[]} Array of 3 Veo3-optimized fallback scripts
 */
function generateVeo3FallbackScripts(character, prompt) {
    const characterDesc = getCharacterDescription(character);
    const characterData = CHARACTER_BIBLE[character] || { voice: "speaks clearly", mannerisms: "moves naturally" };
    
    return [
        `${characterDesc} stands confidently in a bright, modern environment with clean lines and warm lighting. Medium shot composition capturing the character from waist up. The character ${characterData.mannerisms} while looking directly at the camera and says: "Welcome to my story!" (no subtitles!). Camera: Static shot with shallow depth of field. Style: Cinematic, high-key lighting. Audio: Clear dialogue, subtle ambient room tone, soft background music building.`,
        
        `${characterDesc} now sits in a cozy, intimate setting with soft warm lighting creating a personal atmosphere. Close-up shot focusing on the character's expressive gestures. The character ${characterData.mannerisms} while ${characterData.voice} and says: "Let me tell you what happened next." (no subtitles!). Camera: Slow dolly in for emotional connection. Style: Warm, golden hour lighting. Audio: Intimate dialogue, gentle ambient sounds, crackling fireplace in background.`,
        
        `${characterDesc} stands in a dramatic outdoor setting with beautiful natural lighting and scenic background. Wide shot revealing the full environment and character. The character ${characterData.mannerisms} while looking thoughtfully into the distance and says: "And that's how the story ends." (no subtitles!). Camera: Crane shot pulling back to reveal the landscape. Style: Cinematic sunset lighting. Audio: Reflective dialogue, wind through trees, swelling orchestral conclusion.`
    ];
}

module.exports = {
    generateSceneScripts
}; 