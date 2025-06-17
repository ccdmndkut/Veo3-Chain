/*
Purpose: Video generation module using Veo3 API via fal.ai
Generates individual 8-second video clips from scene scripts
*/

const fal = require('@fal-ai/client');
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
        
        const result = await fal.subscribe('fal-ai/veo3', {
            input: {
                prompt: script,
                duration: 8, // 8 seconds as per PRD
                aspect_ratio: '16:9',
                guidance_scale: 7.5,
                num_inference_steps: 50,
                seed: Math.floor(Math.random() * 1000000), // Random seed for variety
            }
        });
        
        if (!result.data || !result.data.video) {
            throw new Error('No video data received from Veo3 API');
        }
        
        const videoUrl = result.data.video.url;
        console.log(`📹 Video ${index + 1} generated successfully, downloading...`);
        
        // Download the video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(videoBuffer));
        
        console.log(`💾 Video ${index + 1} saved to: ${outputPath}`);
        console.log(`💰 Cost incurred: $5.00 (Total so far: $${(index + 1) * 5})`);
        
        return outputPath;
        
    } catch (error) {
        console.error(`Error generating video ${index + 1}:`, error);
        
        // Log cost even on failure (API call was still made)
        console.log(`💰 Cost incurred (failed): $5.00`);
        
        // Create a placeholder or retry logic could go here
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
    const totalCost = scripts.length * 5;
    
    console.log(`🎬 Starting video generation for ${scripts.length} scenes`);
    console.log(`💰 Total estimated cost: $${totalCost}`);
    
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
    console.log(`💰 Total cost: $${totalCost}`);
    
    return videoPaths;
}

/**
 * Get estimated cost for video generation
 * @param {number} numberOfVideos - Number of videos to generate
 * @returns {object} Cost information
 */
function getEstimatedCost(numberOfVideos) {
    const costPerVideo = 5;
    const totalCost = numberOfVideos * costPerVideo;
    
    return {
        numberOfVideos,
        costPerVideo,
        totalCost,
        currency: 'USD',
        warning: 'This is a real cost that will be charged to your fal.ai account'
    };
}

module.exports = {
    generateVideo,
    generateVideos,
    getEstimatedCost
}; 