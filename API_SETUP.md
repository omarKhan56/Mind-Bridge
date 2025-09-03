# 🔑 API Configuration Guide

## Google Gemini AI Setup

### Step 1: Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Configure Environment
1. Copy `.env.example` to `.env`:
   ```bash
   cp server/.env.example server/.env
   ```

2. Edit `server/.env` and replace:
   ```env
   GEMINI_API_KEY=your-google-gemini-api-key-here
   ```
   
   With your actual API key:
   ```env
   GEMINI_API_KEY=AIzaSyC_your_actual_api_key_here
   ```

### Step 3: Test Enhanced AI
Run the test script to verify:
```bash
cd server
node scripts/simpleAITest.js
```

## Enhanced Features with API Key

### ✅ With Valid API Key:
- **Advanced Sentiment Analysis**: Detailed emotional tone detection
- **Crisis Detection**: High-accuracy suicidal ideation detection  
- **Personalized Insights**: AI-generated motivational messages
- **Treatment Recommendations**: Evidence-based intervention suggestions
- **Behavioral Patterns**: Complex pattern recognition
- **Risk Prediction**: Enhanced predictive modeling

### ⚠️ Without API Key (Fallback Mode):
- **Basic Risk Assessment**: Mathematical risk scoring
- **Simple Pattern Detection**: Local algorithm analysis
- **Standard Insights**: Template-based recommendations
- **Crisis Keywords**: Basic keyword-based detection

## API Usage & Limits

### Free Tier:
- 60 requests per minute
- 1,500 requests per day
- Suitable for small to medium deployments

### Production Recommendations:
- Monitor API usage in Google Cloud Console
- Implement rate limiting for high-traffic periods
- Consider upgrading to paid tier for large institutions
- Set up usage alerts

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables only**
3. **Rotate keys regularly**
4. **Monitor usage for unusual activity**
5. **Restrict API key to specific IPs if possible**

## Troubleshooting

### Common Issues:
- **"API key not valid"**: Check key format and permissions
- **Rate limit exceeded**: Implement delays between requests
- **Quota exceeded**: Upgrade plan or wait for reset

### Test Commands:
```bash
# Test basic functionality
node scripts/simpleAITest.js

# Test with sample data
node scripts/testAIAnalysis.js
```

## Alternative AI Providers

If Gemini is unavailable, the system supports:
- **OpenAI GPT**: Modify services to use OpenAI API
- **Local Models**: Integrate with local LLM deployments
- **Fallback Only**: Use mathematical algorithms without external AI

The system is designed to work reliably with or without external AI APIs.
