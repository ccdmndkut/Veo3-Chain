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
            // Vision-capable models (support image input)
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Best for creative writing and analysis (Vision)', supportsVision: true },
            { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Fast and efficient with vision capabilities', supportsVision: true },
            { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Latest OpenAI model with vision (Vision)', supportsVision: true },
            { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Compact vision model, fast and cost-effective', supportsVision: true },
            { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful and versatile with vision (Vision)', supportsVision: true },
            { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s advanced model with vision (Vision)', supportsVision: true },
            { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', description: 'Fast multimodal model with vision capabilities', supportsVision: true },
            { id: 'google/gemini-flash-1.5-8b', name: 'Gemini Flash 1.5 8B', description: 'Efficient vision model for quick processing', supportsVision: true },
            { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Latest lightweight Gemini model with vision capabilities', supportsVision: true },
            { id: 'x-ai/grok-4', name: 'Grok Vision Beta', description: 'X.AI\'s multimodal model with vision capabilities', supportsVision: true },
            { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', description: 'Open source vision model', supportsVision: true },
            { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', description: 'Compact open source vision model', supportsVision: true },
            { id: 'qwen/qwen-2-vl-72b-instruct', name: 'Qwen2-VL 72B', description: 'Advanced Chinese vision-language model', supportsVision: true },
            { id: 'qwen/qwen-2-vl-7b-instruct', name: 'Qwen2-VL 7B', description: 'Efficient vision-language model', supportsVision: true },
            
            // Text-only models
            { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and efficient (Text only)', supportsVision: false },
            { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Open source powerhouse (Text only)', supportsVision: false },
            { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Efficient mixture of experts (Text only)', supportsVision: false },
            { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Perplexity Sonar Large', description: 'With web search capabilities (Text only)', supportsVision: false }
        ];
    }

    /**
     * Get list of available models
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Get the original system prompt (Veo3 guide)
     */
    async getOriginalSystemPrompt() {
        try {
            await this.loadVeo3Guide();
            return this.veo3Guide;
        } catch (error) {
            console.error('Error getting original system prompt:', error);
            throw new Error('Failed to load original system prompt');
        }
    }

    /**
     * Check if a model supports vision
     */
    isVisionModel(modelId) {
        const model = this.availableModels.find(m => m.id === modelId);
        return model && model.supportsVision;
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
    async optimizePrompt(originalPrompt, character = '', context = '', model = 'anthropic/claude-3.5-sonnet', imageData = null, customSystemPrompt = null, systemPromptMode = 'default') {
        // Handle different system prompt modes
        let systemPrompt;
        await this.loadVeo3Guide();
        
        switch (systemPromptMode) {
            case 'replace':
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt = customSystemPrompt.trim();
                    console.log('✅ Using custom system prompt (replace mode)');
                } else {
                    systemPrompt = this.veo3Guide;
                    console.log('✅ Using default Veo3 meta prompt guide (no custom prompt provided)');
                }
                break;
            case 'append':
                systemPrompt = this.veo3Guide;
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt += '\n\n' + customSystemPrompt.trim();
                    console.log('✅ Using default Veo3 meta prompt guide with appended instructions');
                } else {
                    console.log('✅ Using default Veo3 meta prompt guide (no additional instructions)');
                }
                break;
            default: // 'default'
                systemPrompt = this.veo3Guide;
                console.log('✅ Using default Veo3 meta prompt guide');
                break;
        }

        let userPrompt = `Original Prompt: "${originalPrompt}"
${character ? `Character: ${character}` : ''}
${context ? `Context: ${context}` : ''}

Please optimize this prompt using the Veo3 meta prompt guide to create a professional, detailed prompt that will generate high-quality 8-second video content.`;

        // Prepare messages array
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // For vision models with image data, include the image
        if (imageData && this.isVisionModel(model)) {
            userPrompt += '\n\nPlease also analyze the provided reference image and incorporate relevant visual details into the optimized prompt.';
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: imageData } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: userPrompt });
        }

        try {
            const optimizedPrompt = await this.callOpenRouter(messages, model);

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
    async generateOptimizationSuggestions(prompt, model = 'anthropic/claude-3.5-sonnet', imageData = null, customSystemPrompt = null, systemPromptMode = 'default') {
        // Handle different system prompt modes
        let systemPrompt;
        await this.loadVeo3Guide();
        
        switch (systemPromptMode) {
            case 'replace':
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt = customSystemPrompt.trim();
                    console.log('✅ Using custom system prompt for suggestions (replace mode)');
                } else {
                    systemPrompt = this.veo3Guide;
                    console.log('✅ Using default Veo3 meta prompt guide for suggestions (no custom prompt provided)');
                }
                break;
            case 'append':
                systemPrompt = this.veo3Guide;
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt += '\n\n' + customSystemPrompt.trim();
                    console.log('✅ Using default Veo3 meta prompt guide with appended instructions for suggestions');
                } else {
                    console.log('✅ Using default Veo3 meta prompt guide for suggestions (no additional instructions)');
                }
                break;
            default: // 'default'
                systemPrompt = this.veo3Guide;
                console.log('✅ Using default Veo3 meta prompt guide for suggestions');
                break;
        }

        let userPrompt = `Analyze this prompt and provide optimization suggestions:

"${prompt}"

What specific improvements would make this prompt more effective for Veo3 video generation?`;

        // Prepare messages array
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // For vision models with image data, include the image
        if (imageData && this.isVisionModel(model)) {
            userPrompt += '\n\nPlease also analyze the provided reference image and suggest how visual elements from the image could enhance the prompt for better video generation.';
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: imageData } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: userPrompt });
        }

        try {
            const suggestions = await this.callOpenRouter(messages, model);

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

    /**
     * Generate a Veo3 prompt based solely on an image
     */
    async generatePromptFromImage(model = 'anthropic/claude-3.5-sonnet', imageData, customSystemPrompt = null, systemPromptMode = 'default') {
        if (!imageData) {
            throw new Error('Image data is required');
        }

        if (!this.isVisionModel(model)) {
            throw new Error('Selected model does not support vision capabilities');
        }

        // Handle different system prompt modes
        let systemPrompt;
        await this.loadVeo3Guide();
        
        switch (systemPromptMode) {
            case 'replace':
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt = customSystemPrompt.trim();
                    console.log('✅ Using custom system prompt for image generation (replace mode)');
                } else {
                    systemPrompt = this.veo3Guide;
                    console.log('✅ Using default Veo3 meta prompt guide for image generation (no custom prompt provided)');
                }
                break;
            case 'append':
                systemPrompt = this.veo3Guide;
                if (customSystemPrompt && customSystemPrompt.trim()) {
                    systemPrompt += '\n\n' + customSystemPrompt.trim();
                    console.log('✅ Using default Veo3 meta prompt guide with appended instructions for image generation');
                } else {
                    console.log('✅ Using default Veo3 meta prompt guide for image generation (no additional instructions)');
                }
                break;
            default: // 'default'
                systemPrompt = this.veo3Guide;
                console.log('✅ Using default Veo3 meta prompt guide for image generation');
                break;
        }

        const userPrompt = `Please analyze this image and create a professional Veo3 video generation prompt based on what you see. Use the Veo3 meta prompt guide to structure your response with all the appropriate components (Subject, Context, Action, Style, Camera, Mood, etc.).

The prompt should be optimized for generating an 8-second video that captures the essence of what's shown in the image.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: imageData } }
                ]
            }
        ];

        try {
            const generatedPrompt = await this.callOpenRouter(messages, model);

            console.log('✅ Prompt generated from image successfully');
            return {
                original: '[Generated from image]',
                optimized: generatedPrompt,
                character: '',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to generate prompt from image:', error);
            throw error;
        }
    }
}

module.exports = {
    PromptOptimizer
};