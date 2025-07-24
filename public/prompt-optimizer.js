/*
Purpose: Frontend JavaScript for standalone Veo3 Prompt Optimizer
Handles prompt optimization using OpenRouter and Veo3 meta prompt guide
*/

class PromptOptimizer {
    constructor() {
        this.availableModels = [];
        this.currentResult = null;
        this.uploadedImage = null;
        this.originalSystemPrompt = null;
        this.savedPrompts = this.loadSavedPrompts();
        this.promptHistory = this.loadPromptHistory();
        this.initializeEventListeners();
        this.loadAvailableModels();
        this.loadOriginalSystemPrompt();
        this.populateSavedPrompts();
    }

    initializeEventListeners() {
        // Main action buttons
        document.getElementById('optimizeBtn').addEventListener('click', this.optimizePrompt.bind(this));
        document.getElementById('suggestionsBtn').addEventListener('click', this.getSuggestions.bind(this));
        document.getElementById('generateFromImageBtn').addEventListener('click', this.generateFromImage.bind(this));
        
        // Result actions
        document.getElementById('copyBtn').addEventListener('click', this.copyResult.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadResult.bind(this));
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResult(true));
        
        // History actions
        document.getElementById('toggleHistoryBtn').addEventListener('click', this.toggleHistory.bind(this));
        document.getElementById('clearHistoryBtn').addEventListener('click', this.clearHistory.bind(this));
        
        // Image upload functionality
        document.getElementById('imageDropZone').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });
        document.getElementById('imageInput').addEventListener('change', this.handleImageUpload.bind(this));
        document.getElementById('removeImage').addEventListener('click', this.removeImage.bind(this));
        
        // Model selection change to show/hide vision indicator
        document.getElementById('modelSelect').addEventListener('change', this.updateVisionIndicator.bind(this));
        
        // System prompt functionality
        document.getElementById('toggleSystemPrompt').addEventListener('click', this.toggleSystemPrompt.bind(this));
        document.getElementById('resetSystemPrompt').addEventListener('click', this.resetSystemPrompt.bind(this));
        
        // System prompt mode radio buttons
        document.querySelectorAll('input[name="systemPromptMode"]').forEach(radio => {
            radio.addEventListener('change', this.handleSystemPromptModeChange.bind(this));
        });
        
        // Save/Load custom prompts functionality
        document.getElementById('savePromptBtn').addEventListener('click', this.saveCustomPrompt.bind(this));
        document.getElementById('loadPromptBtn').addEventListener('click', this.loadCustomPrompt.bind(this));
        document.getElementById('deletePromptBtn').addEventListener('click', this.deleteCustomPrompt.bind(this));
        
        // Drag and drop functionality
        const dropZone = document.getElementById('imageDropZone');
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
    }

    async loadAvailableModels() {
        try {
            const response = await fetch('/api/openrouter-models');
            const data = await response.json();
            
            if (data.success) {
                this.availableModels = data.models;
                this.populateModelSelect();
            }
        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load available models. Using default model.');
        }
    }

    async loadOriginalSystemPrompt() {
        try {
            console.log('📖 Fetching original system prompt...');
            const response = await fetch('/api/original-system-prompt');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.systemPrompt) {
                this.originalSystemPrompt = data.systemPrompt;
                document.getElementById('originalSystemPromptText').textContent = this.originalSystemPrompt;
                console.log('✅ Original system prompt loaded successfully');
            } else {
                throw new Error(data.error || 'Invalid response format');
            }
        } catch (error) {
            console.error('❌ Error loading original system prompt:', error);
            
            // Fallback: Show a placeholder message
            const fallbackMsg = 'Original Veo3 Meta Prompt Guide will be displayed here when available. Please restart the server if this message persists.';
            document.getElementById('originalSystemPromptText').textContent = fallbackMsg;
            
            // Don't show error notification immediately, as this might be expected on first load
            console.warn('Using fallback message for original system prompt');
        }
    }

    populateModelSelect() {
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect && this.availableModels.length > 0) {
            modelSelect.innerHTML = '';
            
            // Group models by vision capability
            const visionModels = this.availableModels.filter(m => m.supportsVision);
            const textModels = this.availableModels.filter(m => !m.supportsVision);
            
            // Add vision models first
            if (visionModels.length > 0) {
                const visionGroup = document.createElement('optgroup');
                visionGroup.label = '🔍 Vision-Capable Models (Support Images)';
                visionModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} - ${model.description}`;
                    visionGroup.appendChild(option);
                });
                modelSelect.appendChild(visionGroup);
            }
            
            // Add text-only models
            if (textModels.length > 0) {
                const textGroup = document.createElement('optgroup');
                textGroup.label = '📝 Text-Only Models';
                textModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} - ${model.description}`;
                    textGroup.appendChild(option);
                });
                modelSelect.appendChild(textGroup);
            }
            
            // Update vision indicator for initial selection
            this.updateVisionIndicator();
        }
    }

    async optimizePrompt() {
        const prompt = document.getElementById('promptInput').value.trim();
        const character = document.getElementById('characterInput').value.trim();
        let context = document.getElementById('contextInput').value.trim();
        const model = document.getElementById('modelSelect').value;
        const systemPromptData = this.getSystemPromptData();

        if (!prompt) {
            this.showError('Please enter a prompt to optimize.');
            return;
        }

        const optimizeBtn = document.getElementById('optimizeBtn');
        const originalText = optimizeBtn.textContent;
        
        // Check if vision model is selected but no image uploaded
        if (this.isVisionModel(model) && this.uploadedImage) {
            // Add image context to the prompt for vision models
            context = context + (context ? '\n\n' : '') + '[Image uploaded for visual analysis]';
        }
        
        try {
            // Clear previous results when starting new optimization
            this.clearResult();
            
            optimizeBtn.disabled = true;
            optimizeBtn.innerHTML = `<span class="loading mr-2"></span>Optimizing${this.uploadedImage && this.isVisionModel(model) ? ' with image...' : '...'}`;
            
            const requestBody = {
                prompt,
                character,
                context,
                model,
                systemPromptMode: systemPromptData.mode,
                systemPrompt: systemPromptData.content
            };

            // Add image data for vision models
            if (this.uploadedImage && this.isVisionModel(model)) {
                requestBody.image = this.uploadedImage;
            }
            
            const response = await fetch('/api/optimize-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to optimize prompt');
            }
            
            this.currentResult = data.result;
            this.displayOptimizedResult(data.result, model);
            this.showSuccess('Prompt optimized successfully!');
            
        } catch (error) {
            console.error('Error optimizing prompt:', error);
            this.showError(`Error: ${error.message}`);
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.textContent = originalText;
        }
    }

    async getSuggestions() {
        const prompt = document.getElementById('promptInput').value.trim();
        const model = document.getElementById('modelSelect').value;
        const systemPromptData = this.getSystemPromptData();

        if (!prompt) {
            this.showError('Please enter a prompt to get suggestions for.');
            return;
        }

        const suggestionsBtn = document.getElementById('suggestionsBtn');
        const originalText = suggestionsBtn.textContent;
        
        try {
            // Clear previous results when starting new suggestions
            this.clearResult();
            
            suggestionsBtn.disabled = true;
            suggestionsBtn.innerHTML = `<span class="loading mr-2"></span>Analyzing${this.uploadedImage && this.isVisionModel(model) ? ' with image...' : '...'}`;
            
            const requestBody = {
                prompt,
                model,
                systemPromptMode: systemPromptData.mode,
                systemPrompt: systemPromptData.content
            };

            // Add image data for vision models
            if (this.uploadedImage && this.isVisionModel(model)) {
                requestBody.image = this.uploadedImage;
            }
            
            const response = await fetch('/api/prompt-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get suggestions');
            }
            
            this.displaySuggestions(data.result);
            this.showSuccess('Suggestions generated successfully!');
            
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.showError(`Error: ${error.message}`);
        } finally {
            suggestionsBtn.disabled = false;
            suggestionsBtn.textContent = originalText;
        }
    }

    async generateFromImage() {
        const model = document.getElementById('modelSelect').value;
        const systemPromptData = this.getSystemPromptData();

        if (!this.uploadedImage) {
            this.showError('Please upload an image first.');
            return;
        }

        if (!this.isVisionModel(model)) {
            this.showError('Please select a vision-capable model to generate prompts from images.');
            return;
        }

        const generateBtn = document.getElementById('generateFromImageBtn');
        const originalText = generateBtn.textContent;
        
        try {
            // Clear previous results when starting new generation
            this.clearResult();
            
            generateBtn.disabled = true;
            generateBtn.innerHTML = `<span class="loading mr-2"></span>Analyzing image...`;
            
            const requestBody = {
                model,
                image: this.uploadedImage,
                systemPromptMode: systemPromptData.mode,
                systemPrompt: systemPromptData.content
            };
            
            const response = await fetch('/api/generate-from-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate prompt from image');
            }
            
            this.currentResult = data.result;
            this.displayOptimizedResult(data.result, model);
            this.showSuccess('Prompt generated from image successfully!');
            
        } catch (error) {
            console.error('Error generating prompt from image:', error);
            this.showError(`Error: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
        }
    }

    displayOptimizedResult(result, modelUsed) {
        // Hide placeholder and suggestions
        document.getElementById('placeholderMessage').classList.add('hidden');
        document.getElementById('suggestionsResult').classList.add('hidden');
        
        // Show optimized result
        const optimizedResult = document.getElementById('optimizedResult');
        optimizedResult.classList.remove('hidden');
        
        // Populate data - use innerText to preserve line breaks
        document.getElementById('optimizedText').innerText = result.optimized;
        document.getElementById('originalLength').textContent = result.original.length;
        document.getElementById('optimizedLength').textContent = result.optimized.length;
        document.getElementById('modelUsed').textContent = this.getModelName(modelUsed);
        document.getElementById('timestamp').textContent = new Date(result.timestamp).toLocaleString();
        
        // Save to history
        const character = document.getElementById('characterInput').value.trim();
        const context = document.getElementById('contextInput').value.trim();
        this.addToHistory(result, modelUsed, result.original, character, context);
    }

    displaySuggestions(result) {
        // Hide placeholder and optimized result
        document.getElementById('placeholderMessage').classList.add('hidden');
        document.getElementById('optimizedResult').classList.add('hidden');
        
        // Show suggestions result
        const suggestionsResult = document.getElementById('suggestionsResult');
        suggestionsResult.classList.remove('hidden');
        
        // Populate suggestions
        document.getElementById('suggestionsText').textContent = result.suggestions;
    }

    getModelName(modelId) {
        const model = this.availableModels.find(m => m.id === modelId);
        return model ? model.name : modelId;
    }

    copyResult() {
        if (!this.currentResult) {
            this.showError('No result to copy.');
            return;
        }

        navigator.clipboard.writeText(this.currentResult.optimized).then(() => {
            this.showSuccess('Optimized prompt copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard.');
        });
    }

    downloadResult() {
        if (!this.currentResult) {
            this.showError('No result to download.');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `veo3-optimized-prompt-${timestamp}.txt`;
        
        let content = `Veo3 Optimized Prompt\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Model: ${this.getModelName(document.getElementById('modelSelect').value)}\n`;
        content += `${'='.repeat(50)}\n\n`;
        content += `ORIGINAL PROMPT:\n`;
        content += `${this.currentResult.original}\n\n`;
        content += `OPTIMIZED PROMPT:\n`;
        content += `${this.currentResult.optimized}\n\n`;
        content += `${'='.repeat(50)}\n`;
        content += `Optimization Stats:\n`;
        content += `- Original length: ${this.currentResult.original.length} characters\n`;
        content += `- Optimized length: ${this.currentResult.optimized.length} characters\n`;
        content += `- Enhancement: ${((this.currentResult.optimized.length / this.currentResult.original.length - 1) * 100).toFixed(1)}% length change\n`;
        
        // Create blob and download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Prompt downloaded successfully!');
    }

    clearResult(showNotification = false) {
        // Hide results
        document.getElementById('optimizedResult').classList.add('hidden');
        document.getElementById('suggestionsResult').classList.add('hidden');
        
        // Show placeholder
        document.getElementById('placeholderMessage').classList.remove('hidden');
        
        // Clear current result
        this.currentResult = null;
        
        if (showNotification) {
            this.showSuccess('Results cleared.');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        
        const icon = type === 'success' ? '✅' : '❌';
        notification.innerHTML = `
            <span class="mr-2">${icon}</span>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    updateVisionIndicator() {
        const selectedModel = document.getElementById('modelSelect').value;
        const model = this.availableModels.find(m => m.id === selectedModel);
        const visionIndicator = document.getElementById('visionIndicator');
        const imageUploadSection = document.getElementById('imageUploadSection');
        const generateFromImageBtn = document.getElementById('generateFromImageBtn');
        
        if (model && model.supportsVision) {
            visionIndicator.textContent = '- Vision model selected ✓';
            visionIndicator.className = 'text-xs text-green-400';
            imageUploadSection.style.opacity = '1';
            
            // Show generate from image button if image is uploaded
            if (this.uploadedImage) {
                generateFromImageBtn.style.display = 'block';
            }
        } else {
            visionIndicator.textContent = '- Vision models only';
            visionIndicator.className = 'text-xs text-gray-500';
            imageUploadSection.style.opacity = '0.5';
            generateFromImageBtn.style.display = 'none';
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }

    processImageFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Image file size must be less than 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedImage = e.target.result;
            this.showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    showImagePreview(imageSrc) {
        const previewImg = document.getElementById('previewImg');
        const imagePreview = document.getElementById('imagePreview');
        const uploadPrompt = document.getElementById('uploadPrompt');
        const generateFromImageBtn = document.getElementById('generateFromImageBtn');

        previewImg.src = imageSrc;
        imagePreview.classList.remove('hidden');
        uploadPrompt.classList.add('hidden');
        
        // Show generate from image button if vision model is selected
        const selectedModel = document.getElementById('modelSelect').value;
        if (this.isVisionModel(selectedModel)) {
            generateFromImageBtn.style.display = 'block';
        }
    }

    removeImage() {
        this.uploadedImage = null;
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('uploadPrompt').classList.remove('hidden');
        document.getElementById('imageInput').value = '';
        document.getElementById('generateFromImageBtn').style.display = 'none';
    }

    isVisionModel(modelId) {
        const model = this.availableModels.find(m => m.id === modelId);
        return model && model.supportsVision;
    }

    getSystemPromptData() {
        const mode = document.querySelector('input[name="systemPromptMode"]:checked').value;
        const customContent = document.getElementById('systemPromptInput').value.trim();
        
        return {
            mode: mode,
            content: customContent
        };
    }

    handleSystemPromptModeChange() {
        const selectedMode = document.querySelector('input[name="systemPromptMode"]:checked').value;
        const originalDisplay = document.getElementById('originalSystemPromptDisplay');
        const customInput = document.getElementById('customSystemPromptInput');
        const customActions = document.getElementById('customPromptActions');
        const description = document.getElementById('systemPromptDescription');
        const inputLabel = document.getElementById('systemPromptInputLabel');
        
        // Hide all sections first
        originalDisplay.classList.add('hidden');
        customInput.classList.add('hidden');
        customActions.classList.add('hidden');
        
        switch (selectedMode) {
            case 'default':
                description.textContent = 'Using default Veo3 meta prompt guide';
                break;
            case 'replace':
                customInput.classList.remove('hidden');
                customActions.classList.remove('hidden');
                inputLabel.textContent = 'Custom System Prompt (Replace)';
                description.textContent = 'Custom system prompt will replace the default Veo3 meta prompt guide';
                break;
            case 'append':
                originalDisplay.classList.remove('hidden');
                customInput.classList.remove('hidden');
                customActions.classList.remove('hidden');
                inputLabel.textContent = 'Additional Instructions (Append)';
                description.textContent = 'Additional instructions will be appended to the default Veo3 meta prompt guide';
                break;
        }
    }

    toggleSystemPrompt() {
        const section = document.getElementById('systemPromptSection');
        const toggleBtn = document.getElementById('toggleSystemPrompt');
        
        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            toggleBtn.textContent = 'Hide System Prompt Options';
        } else {
            section.classList.add('hidden');
            toggleBtn.textContent = 'Configure System Prompt';
        }
    }

    resetSystemPrompt() {
        // Reset to default mode
        document.getElementById('systemPromptDefault').checked = true;
        document.getElementById('systemPromptInput').value = '';
        document.getElementById('promptNameInput').value = '';
        this.handleSystemPromptModeChange();
        this.showSuccess('System prompt reset to default Veo3 meta prompt guide.');
    }

    loadSavedPrompts() {
        try {
            const saved = localStorage.getItem('veo3-custom-prompts');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading saved prompts:', error);
            return {};
        }
    }

    loadPromptHistory() {
        try {
            const history = localStorage.getItem('veo3-prompt-history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading prompt history:', error);
            return [];
        }
    }

    savePromptHistory() {
        try {
            localStorage.setItem('veo3-prompt-history', JSON.stringify(this.promptHistory));
        } catch (error) {
            console.error('Error saving prompt history:', error);
        }
    }

    addToHistory(result, model, originalPrompt, character, context) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            original: originalPrompt,
            optimized: result.optimized,
            character: character || '',
            context: context || '',
            model: model,
            modelName: this.getModelName(model)
        };

        // Add to beginning of array
        this.promptHistory.unshift(historyItem);

        // Keep only last 20 items
        if (this.promptHistory.length > 20) {
            this.promptHistory = this.promptHistory.slice(0, 20);
        }

        this.savePromptHistory();
        this.updateHistoryDisplay();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all prompt history? This cannot be undone.')) {
            this.promptHistory = [];
            this.savePromptHistory();
            this.updateHistoryDisplay();
            this.showSuccess('Prompt history cleared successfully!');
        }
    }

    toggleHistory() {
        const historySection = document.getElementById('historySection');
        const toggleBtn = document.getElementById('toggleHistoryBtn');
        
        if (historySection.classList.contains('hidden')) {
            historySection.classList.remove('hidden');
            toggleBtn.textContent = '📚 Hide History';
            this.updateHistoryDisplay();
        } else {
            historySection.classList.add('hidden');
            toggleBtn.textContent = '📚 View History';
        }
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        const historyCount = document.getElementById('historyCount');
        
        if (!historyList || !historyCount) return;

        historyCount.textContent = this.promptHistory.length;

        if (this.promptHistory.length === 0) {
            historyList.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <div class="text-4xl mb-2">📝</div>
                    <p>No optimization history yet</p>
                    <p class="text-sm mt-1">Your optimized prompts will appear here</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.promptHistory.map(item => `
            <div class="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <div class="text-xs text-gray-400 mb-1">
                            ${new Date(item.timestamp).toLocaleString()} • ${item.modelName}
                        </div>
                        <div class="text-sm text-gray-300 mb-2">
                            <strong>Original:</strong> ${item.original.substring(0, 100)}${item.original.length > 100 ? '...' : ''}
                        </div>
                        ${item.character ? `<div class="text-xs text-purple-300 mb-1"><strong>Character:</strong> ${item.character}</div>` : ''}
                        ${item.context ? `<div class="text-xs text-blue-300 mb-1"><strong>Context:</strong> ${item.context.substring(0, 80)}${item.context.length > 80 ? '...' : ''}</div>` : ''}
                    </div>
                    <div class="flex gap-1 ml-2">
                        <button onclick="promptOptimizer.viewHistoryItem(${item.id})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">
                            👁️ View
                        </button>
                        <button onclick="promptOptimizer.copyHistoryItem(${item.id})" class="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded">
                            📋 Copy
                        </button>
                        <button onclick="promptOptimizer.deleteHistoryItem(${item.id})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-1 py-1 rounded">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-200 bg-gray-800 rounded p-2 max-h-20 overflow-y-auto">
                    <strong>Optimized:</strong> ${item.optimized.substring(0, 150)}${item.optimized.length > 150 ? '...' : ''}
                </div>
            </div>
        `).join('');
    }

    viewHistoryItem(id) {
        const item = this.promptHistory.find(h => h.id === id);
        if (!item) return;

        // Create modal to view full content
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold text-white">Prompt History Item</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="text-sm text-gray-400">
                            <strong>Generated:</strong> ${new Date(item.timestamp).toLocaleString()} •
                            <strong>Model:</strong> ${item.modelName}
                        </div>
                        
                        ${item.character ? `
                        <div>
                            <h4 class="font-semibold text-purple-400 mb-2">Character</h4>
                            <div class="bg-gray-700 rounded p-3 text-gray-200">${item.character}</div>
                        </div>
                        ` : ''}
                        
                        ${item.context ? `
                        <div>
                            <h4 class="font-semibold text-blue-400 mb-2">Context</h4>
                            <div class="bg-gray-700 rounded p-3 text-gray-200 whitespace-pre-wrap">${item.context}</div>
                        </div>
                        ` : ''}
                        
                        <div>
                            <h4 class="font-semibold text-yellow-400 mb-2">Original Prompt</h4>
                            <div class="bg-gray-700 rounded p-3 text-gray-200 whitespace-pre-wrap">${item.original}</div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-green-400 mb-2">Optimized Prompt</h4>
                            <div class="bg-gray-700 rounded p-3 text-gray-200 whitespace-pre-wrap">${item.optimized}</div>
                        </div>
                        
                        <div class="flex gap-2 pt-4">
                            <button onclick="navigator.clipboard.writeText('${item.optimized.replace(/'/g, "\\'")}').then(() => promptOptimizer.showSuccess('Optimized prompt copied!'))"
                                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                                📋 Copy Optimized
                            </button>
                            <button onclick="navigator.clipboard.writeText('${item.original.replace(/'/g, "\\'")}').then(() => promptOptimizer.showSuccess('Original prompt copied!'))"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                                📋 Copy Original
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    copyHistoryItem(id) {
        const item = this.promptHistory.find(h => h.id === id);
        if (!item) return;

        navigator.clipboard.writeText(item.optimized).then(() => {
            this.showSuccess('Optimized prompt copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard.');
        });
    }

    deleteHistoryItem(id) {
        if (confirm('Are you sure you want to delete this history item?')) {
            this.promptHistory = this.promptHistory.filter(h => h.id !== id);
            this.savePromptHistory();
            this.updateHistoryDisplay();
            this.showSuccess('History item deleted successfully!');
        }
    }

    saveSavedPrompts() {
        try {
            localStorage.setItem('veo3-custom-prompts', JSON.stringify(this.savedPrompts));
        } catch (error) {
            console.error('Error saving prompts:', error);
            this.showError('Failed to save prompt to local storage.');
        }
    }

    populateSavedPrompts() {
        const select = document.getElementById('savedPromptsSelect');
        const count = Object.keys(this.savedPrompts).length;
        select.innerHTML = `<option value="">Load saved... (${count})</option>`;
        
        Object.keys(this.savedPrompts).forEach(name => {
            const prompt = this.savedPrompts[name];
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${prompt.mode})`;
            select.appendChild(option);
        });
    }

    saveCustomPrompt() {
        const name = document.getElementById('promptNameInput').value.trim();
        const content = document.getElementById('systemPromptInput').value.trim();
        const mode = document.querySelector('input[name="systemPromptMode"]:checked').value;

        if (!name) {
            this.showError('Please enter a name for the prompt.');
            return;
        }

        if (!content && mode !== 'default') {
            this.showError('Please enter prompt content to save.');
            return;
        }

        if (mode === 'default') {
            this.showError('Cannot save default mode. Please select Replace or Append mode.');
            return;
        }

        // Save the prompt
        this.savedPrompts[name] = {
            content: content,
            mode: mode,
            timestamp: new Date().toISOString()
        };

        this.saveSavedPrompts();
        this.populateSavedPrompts();
        
        // Clear the name input
        document.getElementById('promptNameInput').value = '';
        
        this.showSuccess(`Prompt "${name}" saved successfully!`);
    }

    loadCustomPrompt() {
        const select = document.getElementById('savedPromptsSelect');
        const selectedName = select.value;

        if (!selectedName) {
            this.showError('Please select a prompt to load.');
            return;
        }

        const prompt = this.savedPrompts[selectedName];
        if (!prompt) {
            this.showError('Selected prompt not found.');
            return;
        }

        // Set the mode
        document.getElementById(prompt.mode === 'replace' ? 'systemPromptReplace' : 'systemPromptAppend').checked = true;
        
        // Set the content
        document.getElementById('systemPromptInput').value = prompt.content;
        
        // Update the UI
        this.handleSystemPromptModeChange();
        
        this.showSuccess(`Prompt "${selectedName}" loaded successfully!`);
    }

    deleteCustomPrompt() {
        const select = document.getElementById('savedPromptsSelect');
        const selectedName = select.value;

        if (!selectedName) {
            this.showError('Please select a prompt to delete.');
            return;
        }

        if (confirm(`Are you sure you want to delete the prompt "${selectedName}"?`)) {
            delete this.savedPrompts[selectedName];
            this.saveSavedPrompts();
            this.populateSavedPrompts();
            this.showSuccess(`Prompt "${selectedName}" deleted successfully!`);
        }
    }
}

// Initialize the application when DOM is loaded
let promptOptimizer;
document.addEventListener('DOMContentLoaded', () => {
    promptOptimizer = new PromptOptimizer();
    console.log('🚀 Veo3 Prompt Optimizer initialized');
});