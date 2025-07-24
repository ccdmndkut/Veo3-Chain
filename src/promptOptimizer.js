/*
Purpose: Prompt optimization service using OpenRouter API
Optimizes prompts using the Veo3 meta prompt guide from prompts/a.md
*/

const fs = require('fs').promises;
const path = require('path');

/**
 * OpenRouter API client for prompt optimization
 */
class PromptOptimizer {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.veo3Guide = null;
        this.availableModels = [
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Best for creative writing and analysis' },
            { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
            { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Latest OpenAI model' },
            { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful and versatile' },
            { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s advanced model' },
            { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Open source powerhouse' },
            { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Efficient mixture of experts' },
            { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Perplexity Sonar Large', description: 'With web search capabilities' }
        ];
    }

    /**
     * Get list of available models
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Load the Veo3 meta prompt guide
     */
    async loadVeo3Guide() {
        if (this.veo3Guide) return this.veo3Guide;
        
        try {
            const guidePath = path.join(__dirname, '..', 'prompts', 'a.md');
            this.veo3Guide = await fs.readFile(guidePath, 'utf8');
            console.log('✅ Loaded Veo3 meta prompt guide');
            return this.veo3Guide;
        } catch (error) {
            console.error('❌ Failed to load Veo3 guide:', error);
            throw new Error('Failed to load Veo3 meta prompt guide');
        }
    }

    /**
     * Make API call to OpenRouter
     */
    async callOpenRouter(messages, model = 'anthropic/claude-3.5-sonnet') {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://veo3-chain.local',
                'X-Title': 'Veo3 Chain Prompt Optimizer'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Optimize a single prompt using the Veo3 guide
     */
    async optimizePrompt(originalPrompt, character = '', context = '', model = 'anthropic/claude-3.5-sonnet') {
        await this.loadVeo3Guide();

        // Use the exact content from prompts/a.md as the system prompt
        const systemPrompt = this.veo3Guide;

        const userPrompt = `Original Prompt: "${originalPrompt}"
${character ? `Character: ${character}` : ''}
${context ? `Context: ${context}` : ''}

Please optimize this prompt using the Veo3 meta prompt guide to create a professional, detailed prompt that will generate high-quality 8-second video content.`;

        try {
            const optimizedPrompt = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], model);

            console.log('✅ Prompt optimized successfully');
            return {
                original: originalPrompt,
                optimized: optimizedPrompt,
                character: character,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Prompt optimization failed:', error);
            throw error;
        }
    }

    /**
     * Optimize multiple prompts (for scene scripts)
     */
    async optimizeScenePrompts(prompts, character = '', model = 'anthropic/claude-3.5-sonnet') {
        const optimizedPrompts = [];
        
        for (let i = 0; i < prompts.length; i++) {
            const sceneContext = `Scene ${i + 1} of ${prompts.length} in a cohesive story sequence`;
            console.log(`🔧 Optimizing scene ${i + 1}/${prompts.length}...`);
            
            try {
                const result = await this.optimizePrompt(prompts[i], character, sceneContext, model);
                optimizedPrompts.push(result);
                
                // Add small delay to avoid rate limiting
                if (i < prompts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Failed to optimize scene ${i + 1}:`, error);
                // Include original prompt if optimization fails
                optimizedPrompts.push({
                    original: prompts[i],
                    optimized: prompts[i],
                    character: character,
                    timestamp: new Date().toISOString(),
                    error: error.message
                });
            }
        }

        return optimizedPrompts;
    }

    /**
     * Generate optimization suggestions based on the Veo3 guide
     */
    async generateOptimizationSuggestions(prompt, model = 'anthropic/claude-3.5-sonnet') {
        await this.loadVeo3Guide();

        // Use the exact content from prompts/a.md as the system prompt
        const systemPrompt = this.veo3Guide;

        const userPrompt = `Analyze this prompt and provide optimization suggestions:

"${prompt}"

What specific improvements would make this prompt more effective for Veo3 video generation?`;

        try {
            const suggestions = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], model);

            return {
                prompt: prompt,
                suggestions: suggestions,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to generate suggestions:', error);
            throw error;
        }
    }
}

module.exports = {
    PromptOptimizer
};