/*
Purpose: Video generation module using Veo3 API via fal.ai
Generates individual video clips from scene scripts
*/

const { fal } = require('@fal-ai/client');
const fs = require('fs').promises;
const path = require('path');

// Configure fal client with API key
fal.config({
    credentials: process.env.FAL_KEY
});

/**
 * Generate a single video from a scene script
 * @param {string} script - The scene script/prompt
 * @param {string} character - The main character for consistency
 * @param {number} index - Scene index (0, 1, 2)
 * @returns {Promise<string>} Path to the generated video file
 */
async function generateVideo(script, character, index) {
    const tempDir = process.env.TEMP_DIR || './temp';
    const outputPath = path.join(tempDir, `scene_${index + 1}_${Date.now()}.mp4`);
    
    try {
        console.log(`🎬 Generating video ${index + 1}/3: ${script.substring(0, 100)}...`);
        console.log(`📝 Full prompt (${script.length} chars): ${script}`);
        
        // Only truncate if extremely long (Veo3 can handle detailed prompts)
        const maxPromptLength = 2000; // Much more generous limit
        const trimmedScript = script.length > maxPromptLength 
            ? script.substring(0, maxPromptLength - 3) + '...'
            : script;
            
        if (script.length > maxPromptLength) {
            console.log(`⚠️ Prompt truncated from ${script.length} to ${trimmedScript.length} characters`);
        }
        
        // Use working parameters from successful test
        const result = await fal.subscribe('fal-ai/veo3', {
            input: {
                prompt: trimmedScript,
                aspect_ratio: '16:9'
                // Note: Don't include audio parameter - it causes 422 validation error
            }
        });
        
        if (!result.data || !result.data.video) {
            throw new Error('No video data received from Veo3 API');
        }
        
        const videoUrl = result.data.video.url;
        console.log(`📹 Video ${index + 1} generated successfully, downloading...`);
        console.log(`🔗 Video URL: ${videoUrl}`);
        
        // Download the video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(videoBuffer));
        
        console.log(`💾 Video ${index + 1} saved to: ${outputPath}`);
        console.log(`💰 Cost incurred: Variable cost based on video length`);
        
        return outputPath;
        
    } catch (error) {
        console.error(`Error generating video ${index + 1}:`, error);
        
        // Enhanced error logging for debugging
        if (error.status === 422 && error.body) {
            console.error(`🚨 Validation Error Details:`, JSON.stringify(error.body, null, 2));
            if (error.body.detail) {
                console.error(`🔍 Specific validation issues:`, error.body.detail);
                // Log each validation error detail
                error.body.detail.forEach((detail, i) => {
                    console.error(`   ${i + 1}. ${JSON.stringify(detail)}`);
                });
            }
        }
        
        // Log the prompt that failed
        console.error(`❌ Failed prompt (${script.length} chars): ${script}`);
        
        // Log cost even on failure (API call was still made)
        console.log(`💰 Cost incurred (failed): Variable cost`);
        
        throw new Error(`Failed to generate video ${index + 1}: ${error.message}`);
    }
}

/**
 * Generate multiple videos in sequence with progress tracking
 * @param {string[]} scripts - Array of scene scripts
 * @param {string} character - The main character
 * @returns {Promise<string[]>} Array of paths to generated video files
 */
async function generateVideos(scripts, character) {
    const videoPaths = [];
    
    console.log(`🎬 Starting video generation for ${scripts.length} scenes`);
    console.log(`💰 Cost will vary based on video length ($0.50 per second)`);
    
    // Log all scripts for debugging
    scripts.forEach((script, index) => {
        console.log(`📋 Script ${index + 1} (${script.length} chars):`, script.substring(0, 200) + '...');
    });
    
    for (let i = 0; i < scripts.length; i++) {
        try {
            const videoPath = await generateVideo(scripts[i], character, i);
            videoPaths.push(videoPath);
            
            // Progress update
            const progress = ((i + 1) / scripts.length * 100).toFixed(1);
            console.log(`✅ Progress: ${progress}% (${i + 1}/${scripts.length} videos completed)`);
            
        } catch (error) {
            console.error(`❌ Failed to generate video ${i + 1}`);
            throw error; // Stop the process if any video fails
        }
    }
    
    console.log(`🎉 All videos generated successfully!`);
    
    return videoPaths;
}

/**
 * Get estimated cost for video generation
 * @param {number} numberOfVideos - Number of videos to generate
 * @returns {object} Cost information
 */
function getEstimatedCost(numberOfVideos) {
    const estimatedSecondsPerVideo = 8; // Rough estimate
    const costPerSecond = 0.50;
    const estimatedCostPerVideo = estimatedSecondsPerVideo * costPerSecond;
    const totalCost = numberOfVideos * estimatedCostPerVideo;
    
    return {
        numberOfVideos,
        estimatedSecondsPerVideo,
        costPerSecond,
        estimatedCostPerVideo,
        totalCost,
        currency: 'USD',
        warning: 'Actual cost varies by video length. Veo3 charges $0.50 per second of generated video.'
    };
}

module.exports = {
    generateVideo,
    generateVideos,
    getEstimatedCost
}; 