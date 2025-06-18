/*
Purpose: Video processing module using fluent-ffmpeg
Concatenates multiple video clips into a single MP4 file
*/

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

/**
 * Concatenate multiple video files into a single MP4
 * @param {string[]} videoPaths - Array of paths to video files
 * @param {string} character - Character name for output filename
 * @returns {Promise<string>} Path to the concatenated video file
 */
async function concatenateVideos(videoPaths, character) {
    const outputDir = process.env.OUTPUT_DIR || './output';
    const timestamp = Date.now();
    const sanitizedCharacter = character.replace(/[^a-zA-Z0-9]/g, '_');
    const outputPath = path.join(outputDir, `${sanitizedCharacter}_story_${timestamp}.mp4`);
    
    return new Promise((resolve, reject) => {
        console.log(`🔗 Concatenating ${videoPaths.length} videos...`);
        console.log('Input files:', videoPaths);
        
        const command = ffmpeg();
        
        // Add each video input
        videoPaths.forEach(videoPath => {
            command.input(videoPath);
        });
        
        // Configure output
        command
            .on('start', (commandLine) => {
                console.log('🎬 FFmpeg process started:', commandLine);
            })
            .on('progress', (progress) => {
                console.log(`📊 Processing: ${progress.percent ? progress.percent.toFixed(2) : 'N/A'}% done`);
            })
            .on('end', () => {
                console.log(`✅ Video concatenation completed: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('❌ FFmpeg error:', err);
                reject(new Error(`Video concatenation failed: ${err.message}`));
            })
            .complexFilter([
                // Create a filter to concatenate videos
                videoPaths.map((_, index) => `[${index}:v] [${index}:a]`).join(' ') + 
                ` concat=n=${videoPaths.length}:v=1:a=1 [outv] [outa]`
            ], ['outv', 'outa'])
            .outputOptions([
                '-c:v libx264',      // Video codec
                '-c:a aac',          // Audio codec
                '-preset fast',      // Encoding speed
                '-crf 23',           // Quality (lower = better quality)
                '-movflags +faststart' // Enable streaming
            ])
            .output(outputPath)
            .run();
    });
}

/**
 * Get video information (duration, resolution, etc.)
 * @param {string} videoPath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
function getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get video info: ${err.message}`));
            } else {
                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                
                resolve({
                    duration: parseFloat(metadata.format.duration),
                    size: parseInt(metadata.format.size),
                    bitrate: parseInt(metadata.format.bit_rate),
                    video: videoStream ? {
                        width: videoStream.width,
                        height: videoStream.height,
                        fps: eval(videoStream.r_frame_rate), // Convert fraction to decimal
                        codec: videoStream.codec_name
                    } : null,
                    audio: audioStream ? {
                        codec: audioStream.codec_name,
                        sampleRate: audioStream.sample_rate,
                        channels: audioStream.channels
                    } : null
                });
            }
        });
    });
}

/**
 * Clean up temporary video files
 * @param {string[]} tempFiles - Array of temporary file paths to delete
 * @returns {Promise<void>}
 */
async function cleanupTempFiles(tempFiles) {
    console.log(`🧹 Cleaning up ${tempFiles.length} temporary files...`);
    
    const deletePromises = tempFiles.map(async (filePath) => {
        try {
            await fs.unlink(filePath);
            console.log(`🗑️ Deleted: ${filePath}`);
        } catch (error) {
            console.warn(`⚠️ Failed to delete ${filePath}:`, error.message);
        }
    });
    
    await Promise.all(deletePromises);
    console.log('✅ Cleanup completed');
}

/**
 * Validate video files exist and are accessible
 * @param {string[]} videoPaths - Array of video file paths
 * @returns {Promise<boolean>} True if all files are valid
 */
async function validateVideoFiles(videoPaths) {
    console.log('🔍 Validating video files...');
    
    for (const videoPath of videoPaths) {
        try {
            await fs.access(videoPath);
            const stats = await fs.stat(videoPath);
            
            if (stats.size === 0) {
                throw new Error(`Video file is empty: ${videoPath}`);
            }
            
            console.log(`✅ Valid: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (error) {
            console.error(`❌ Invalid video file: ${videoPath}`, error.message);
            return false;
        }
    }
    
    return true;
}

module.exports = {
    concatenateVideos,
    getVideoInfo,
    cleanupTempFiles,
    validateVideoFiles
}; 