/*
Purpose: Main Express server for Veo3 Short-Form Story Generator
Handles web interface, API endpoints, and coordinates video generation workflow
*/

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const { generateSceneScripts } = require('./src/scriptGenerator');
const { generateVideo } = require('./src/videoGenerator');
const { concatenateVideos } = require('./src/videoProcessor');
const { PromptOptimizer } = require('./src/promptOptimizer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// Ensure directories exist
async function ensureDirectories() {
    const dirs = ['temp', 'output', 'public'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for standalone prompt optimizer
app.get('/prompt-optimizer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'prompt-optimizer.html'));
});

// API endpoint to generate scene scripts
app.post('/api/generate-scripts', async (req, res) => {
    try {
        const { character, prompt, promptsOnly } = req.body;
        
        if (!character || !prompt) {
            return res.status(400).json({
                error: 'Character and prompt are required'
            });
        }

        console.log(`Generating scripts for character: ${character}, prompt: ${prompt}, promptsOnly: ${promptsOnly}`);
        
        const scripts = await generateSceneScripts(character, prompt);
        
        res.json({
            success: true,
            scripts,
            promptsOnly: promptsOnly || false,
            estimatedCost: promptsOnly ? 0 : scripts.length * 4 // No cost if prompts only
        });
    } catch (error) {
        console.error('Error generating scripts:', error);
        res.status(500).json({ 
            error: 'Failed to generate scripts', 
            details: error.message 
        });
    }
});

// API endpoint to generate videos
app.post('/api/generate-videos', async (req, res) => {
    try {
        const { scripts, character } = req.body;
        
        if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
            return res.status(400).json({ 
                error: 'Valid scripts array is required' 
            });
        }

        console.log(`Generating ${scripts.length} videos for character: ${character}`);
        
        // Generate videos for each script
        const videoPromises = scripts.map((script, index) => 
            generateVideo(script, character, index)
        );
        
        const videoResults = await Promise.all(videoPromises);
        
        // Concatenate videos
        const finalVideoPath = await concatenateVideos(videoResults, character);
        
        res.json({
            success: true,
            videoPath: finalVideoPath,
            message: 'Video generation completed successfully'
        });
    } catch (error) {
        console.error('Error generating videos:', error);
        res.status(500).json({ 
            error: 'Failed to generate videos', 
            details: error.message 
        });
    }
});

// Initialize prompt optimizer for standalone feature
const promptOptimizer = new PromptOptimizer();

// API endpoint to get available OpenRouter models
app.get('/api/openrouter-models', (req, res) => {
    try {
        const models = promptOptimizer.getAvailableModels();
        res.json({
            success: true,
            models
        });
    } catch (error) {
        console.error('Error getting models:', error);
        res.status(500).json({
            error: 'Failed to get available models',
            details: error.message
        });
    }
});

// API endpoint to get the original system prompt
app.get('/api/original-system-prompt', async (req, res) => {
    try {
        console.log('📖 Loading original system prompt...');
        const systemPrompt = await promptOptimizer.getOriginalSystemPrompt();
        console.log('✅ Original system prompt loaded successfully');
        res.json({
            success: true,
            systemPrompt
        });
    } catch (error) {
        console.error('❌ Error getting original system prompt:', error);
        res.status(500).json({
            error: 'Failed to get original system prompt',
            details: error.message
        });
    }
});

// API endpoint to optimize a single prompt (standalone feature)
app.post('/api/optimize-prompt', async (req, res) => {
    try {
        const { prompt, character, context, model, image, systemPrompt, systemPromptMode } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                error: 'Prompt is required'
            });
        }

        const hasImage = image ? ' with image' : '';
        const systemMode = systemPromptMode || 'default';
        const hasCustomSystem = systemMode !== 'default' ? ` with ${systemMode} system prompt` : '';
        console.log(`Optimizing prompt with model ${model || 'default'}${hasImage}${hasCustomSystem}: ${prompt.substring(0, 100)}...`);
        
        const result = await promptOptimizer.optimizePrompt(prompt, character, context, model, image, systemPrompt, systemPromptMode);
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Error optimizing prompt:', error);
        res.status(500).json({
            error: 'Failed to optimize prompt',
            details: error.message
        });
    }
});

// API endpoint to get optimization suggestions (standalone feature)
app.post('/api/prompt-suggestions', async (req, res) => {
    try {
        const { prompt, model, image, systemPrompt, systemPromptMode } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                error: 'Prompt is required'
            });
        }

        const hasImage = image ? ' with image' : '';
        const systemMode = systemPromptMode || 'default';
        const hasCustomSystem = systemMode !== 'default' ? ` with ${systemMode} system prompt` : '';
        console.log(`Generating suggestions for prompt with model ${model || 'default'}${hasImage}${hasCustomSystem}: ${prompt.substring(0, 100)}...`);
        
        const result = await promptOptimizer.generateOptimizationSuggestions(prompt, model, image, systemPrompt, systemPromptMode);
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({
            error: 'Failed to generate suggestions',
            details: error.message
        });
    }
});

// API endpoint to generate prompt from image only (standalone feature)
app.post('/api/generate-from-image', async (req, res) => {
    try {
        const { model, image, systemPrompt, systemPromptMode } = req.body;
        
        if (!image) {
            return res.status(400).json({
                error: 'Image is required'
            });
        }

        const systemMode = systemPromptMode || 'default';
        const hasCustomSystem = systemMode !== 'default' ? ` with ${systemMode} system prompt` : '';
        console.log(`Generating prompt from image with model ${model || 'default'}${hasCustomSystem}`);
        
        const result = await promptOptimizer.generatePromptFromImage(model, image, systemPrompt, systemPromptMode);
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Error generating prompt from image:', error);
        res.status(500).json({
            error: 'Failed to generate prompt from image',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        details: err.message 
    });
});

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        app.listen(PORT, () => {
            console.log(`🚀 Veo3 Story Generator server running on http://localhost:${PORT}`);
            console.log(`💰 Veo3 pricing: $0.50 per second (8-second videos ≈ $4 each)`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 