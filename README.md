<!--
Purpose: Setup and usage documentation for Veo3 Short-Form Story Generator
Provides installation, configuration, and usage instructions
-->

# 🎬 Veo3 Short-Form Story Generator

Create engaging 30-second video stories with consistent characters using the power of Veo3 AI and intelligent script generation.

## ✨ Features

- **Character Consistency**: Maintains character appearance across all scenes
- **Intelligent Script Generation**: Uses GPT-4 to create compelling 3-scene narratives
- **Cost-Aware**: Clear cost warnings and confirmations ($15 per story)
- **Modern Web Interface**: Clean, responsive UI with progress tracking
- **Video Processing**: Automatically concatenates clips into a single MP4 file

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- FFmpeg installed on your system
- OpenAI API key
- fal.ai API key (for Veo3 access)

### Installation

1. **Clone and setup**
```bash
git clone https://github.com/HenryAllen04/Veo3-Chain.git
cd Veo3-Chain
git checkout feature/veo3-story-generator
npm install
```

2. **Configure environment variables**
```bash
cp env.example .env
```

Edit `.env` and add your API keys:
```env
FAL_KEY=your_fal_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

3. **Create required directories**
```bash
mkdir -p temp output public
```

4. **Start the server**
```bash
npm run dev  # Development mode with auto-restart
# or
npm start    # Production mode
```

5. **Open your browser**
Navigate to `http://localhost:3000`

## 💰 Cost Information

- **Per Story**: $15 (3 videos × $5 each)
- **API Provider**: fal.ai (Veo3 API)
- **Script Generation**: ~$0.01 per story (OpenAI GPT-4)

**⚠️ Important**: Real costs are incurred when generating videos. The application provides clear warnings before any API calls.

## 🎯 Usage

1. **Select Character**: Choose from presets (Stormtrooper, Wizard, etc.) or create custom
2. **Write Story Prompt**: Describe your story idea in plain English
3. **Review Scripts**: Generated 3-scene scripts are shown for approval
4. **Confirm Generation**: Click to proceed with video generation ($15 cost)
5. **Download Result**: Get your final concatenated MP4 video

### Example Prompts

- "A stormtrooper vlogs their day in three scenes"
- "A wizard discovers modern technology for the first time"
- "A detective solves a mystery involving missing cookies"

## 🏗️ Project Structure

```
Veo3-Chain/
├── server.js              # Main Express server
├── src/
│   ├── scriptGenerator.js # OpenAI script generation
│   ├── videoGenerator.js  # Veo3 API integration
│   └── videoProcessor.js  # FFmpeg video concatenation
├── public/
│   ├── index.html         # Web interface
│   └── app.js            # Frontend JavaScript
├── temp/                  # Temporary video files
├── output/               # Final video outputs
└── env.example           # Environment variables template
```

## 🔧 API Endpoints

- `GET /` - Web interface
- `POST /api/generate-scripts` - Generate scene scripts
- `POST /api/generate-videos` - Generate and concatenate videos
- `GET /api/health` - Health check

## 🛠️ Development

### Running in Development Mode

```bash
npm run dev
```

This uses nodemon for automatic server restarts on file changes.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FAL_KEY` | fal.ai API key for Veo3 | Yes |
| `OPENAI_API_KEY` | OpenAI API key for script generation | Yes |
| `PORT` | Server port (default: 3000) | No |
| `TEMP_DIR` | Temporary files directory | No |
| `OUTPUT_DIR` | Output videos directory | No |

## 🔍 Troubleshooting

### Common Issues

**FFmpeg not found**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

**API Key Issues**
- Ensure `.env` file exists and contains valid API keys
- Check that fal.ai account has sufficient credits
- Verify OpenAI API key has GPT-4 access

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 📝 Technical Details

### Video Specifications
- **Duration**: 8 seconds per scene (24 seconds total)
- **Format**: MP4 (H.264 + AAC)
- **Aspect Ratio**: 16:9
- **Quality**: CRF 23 (high quality)

### Script Generation
- **Model**: GPT-4
- **Output**: 3 detailed scene descriptions
- **Fallback**: Template-based scripts if API fails

### Cost Optimization
- Scripts generated before any video API calls
- User confirmation required before generation
- Clear cost warnings throughout UI

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly (especially cost implications)
4. Submit a pull request

## 📄 License

ISC License - see package.json for details

## 🆘 Support

For issues:
1. Check troubleshooting section above
2. Review server logs for detailed error messages
3. Open an issue on GitHub with full error details

---

**Built with ❤️ for storytellers • Powered by Veo3 & OpenAI** 
