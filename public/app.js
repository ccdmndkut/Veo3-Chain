/*
Purpose: Frontend JavaScript for Veo3 Story Generator
Handles UI interactions, API calls, and progress tracking
*/

class Veo3StoryGenerator {
    constructor() {
        this.currentScripts = [];
        this.currentCharacter = '';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Character selection
        document.getElementById('character').addEventListener('change', this.handleCharacterChange.bind(this));
        
        // Step 1: Generate scripts
        document.getElementById('generateScripts').addEventListener('click', this.generateScripts.bind(this));
        
        // Step 2: Navigation and confirmation
        document.getElementById('backToEdit').addEventListener('click', this.backToStep1.bind(this));
        document.getElementById('confirmGenerate').addEventListener('click', this.generateVideos.bind(this));
        
        // Step 4: Final actions
        document.getElementById('createAnother').addEventListener('click', this.reset.bind(this));
    }

    handleCharacterChange(event) {
        const customInput = document.getElementById('customCharacter');
        if (event.target.value === 'custom') {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
        }
    }

    getSelectedCharacter() {
        const characterSelect = document.getElementById('character');
        const customInput = document.getElementById('customCharacter');
        
        if (characterSelect.value === 'custom') {
            return customInput.value.trim();
        } else {
            return characterSelect.value;
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`step${i}`).classList.add('hidden');
        }
        
        // Show selected step
        document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    }

    async generateScripts() {
        const character = this.getSelectedCharacter();
        const prompt = document.getElementById('prompt').value.trim();
        
        // Validation
        if (!character) {
            alert('Please select or enter a character');
            return;
        }
        
        if (!prompt) {
            alert('Please enter a story prompt');
            return;
        }

        const generateBtn = document.getElementById('generateScripts');
        const originalText = generateBtn.textContent;
        
        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="loading mr-2"></span>Generating Scripts...';
            
            const response = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ character, prompt })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate scripts');
            }
            
            this.currentScripts = data.scripts;
            this.currentCharacter = character;
            
            this.displayScripts(data.scripts);
            this.showStep(2);
            
        } catch (error) {
            console.error('Error generating scripts:', error);
            alert(`Error: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
        }
    }

    displayScripts(scripts) {
        const container = document.getElementById('scriptsContainer');
        container.innerHTML = '';
        
        scripts.forEach((script, index) => {
            const scriptDiv = document.createElement('div');
            scriptDiv.className = 'border border-gray-300 rounded-lg p-4';
            scriptDiv.innerHTML = `
                <h3 class="font-semibold text-lg mb-2">Scene ${index + 1}</h3>
                <p class="text-gray-700">${script}</p>
            `;
            container.appendChild(scriptDiv);
        });
    }

    backToStep1() {
        this.showStep(1);
    }

    async generateVideos() {
        if (!this.currentScripts || this.currentScripts.length === 0) {
            alert('No scripts available. Please generate scripts first.');
            return;
        }

        this.showStep(3);
        this.resetProgress();
        
        try {
            // Show generation is starting
            this.updateStatus('status1', 'Scene 1: Starting generation...', true);
            
            const response = await fetch('/api/generate-videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scripts: this.currentScripts,
                    character: this.currentCharacter
                })
            });
            
            // Note: This is a simplified version. In a real implementation,
            // you'd want to use WebSockets or Server-Sent Events for real-time progress
            this.simulateProgress();
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate videos');
            }
            
            this.completeProgress();
            
            // Show the result
            setTimeout(() => {
                this.showResult(data.videoPath);
            }, 1000);
            
        } catch (error) {
            console.error('Error generating videos:', error);
            alert(`Error: ${error.message}`);
            this.showStep(2); // Go back to step 2
        }
    }

    resetProgress() {
        // Reset progress bar
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        
        // Reset status indicators
        for (let i = 1; i <= 3; i++) {
            this.updateStatus(`status${i}`, `Scene ${i}: Waiting...`, false);
        }
        this.updateStatus('statusConcat', 'Video concatenation: Waiting...', false);
    }

    updateStatus(statusId, message, showLoading) {
        const statusElement = document.getElementById(statusId);
        const loadingSpinner = statusElement.querySelector('.loading');
        const textElement = statusElement.querySelector('span:last-child');
        
        textElement.textContent = message;
        
        if (showLoading) {
            loadingSpinner.classList.remove('hidden');
            statusElement.className = 'flex items-center text-blue-600';
        } else {
            loadingSpinner.classList.add('hidden');
            statusElement.className = 'flex items-center text-green-600';
        }
    }

    simulateProgress() {
        // This is a simplified progress simulation
        // In a real implementation, you'd get actual progress from the server
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90; // Don't complete until actual completion
            
            this.updateProgressBar(progress);
            
            // Update status based on progress
            if (progress > 10 && progress < 40) {
                this.updateStatus('status1', 'Scene 1: Generating video...', true);
            } else if (progress > 40 && progress < 70) {
                this.updateStatus('status1', 'Scene 1: Complete ✓', false);
                this.updateStatus('status2', 'Scene 2: Generating video...', true);
            } else if (progress > 70 && progress < 90) {
                this.updateStatus('status2', 'Scene 2: Complete ✓', false);
                this.updateStatus('status3', 'Scene 3: Generating video...', true);
            }
            
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 1000);
    }

    completeProgress() {
        this.updateProgressBar(100);
        this.updateStatus('status1', 'Scene 1: Complete ✓', false);
        this.updateStatus('status2', 'Scene 2: Complete ✓', false);
        this.updateStatus('status3', 'Scene 3: Complete ✓', false);
        this.updateStatus('statusConcat', 'Video concatenation: Complete ✓', false);
    }

    updateProgressBar(percentage) {
        document.getElementById('progressBar').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${Math.round(percentage)}%`;
    }

    showResult(videoPath) {
        const video = document.getElementById('resultVideo');
        const downloadBtn = document.getElementById('downloadBtn');
        
        // Set video source
        video.src = videoPath;
        
        // Set download link
        downloadBtn.href = videoPath;
        downloadBtn.download = videoPath.split('/').pop();
        
        this.showStep(4);
    }

    reset() {
        // Reset all form data
        document.getElementById('character').value = '';
        document.getElementById('customCharacter').value = '';
        document.getElementById('customCharacter').classList.add('hidden');
        document.getElementById('prompt').value = '';
        
        // Reset internal state
        this.currentScripts = [];
        this.currentCharacter = '';
        
        // Show step 1
        this.showStep(1);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Veo3StoryGenerator();
    console.log('🎬 Veo3 Story Generator initialized');
}); 