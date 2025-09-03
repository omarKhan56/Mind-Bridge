const fs = require('fs');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the constructor and model initialization
  content = content.replace(
    /const genAI = new GoogleGenerativeAI\(process\.env\.GEMINI_API_KEY\);[\s\S]*?this\.model = genAI\.getGenerativeModel\([^}]+\);/,
    `getModel() {
    if (!this.model && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    return this.model;
  }

  constructor() {
    this.model = null;
  }`
  );
  
  // Replace this.model usage with this.getModel()
  content = content.replace(/await this\.model\.generateContent/g, 'await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${filePath}`);
};

// Fix all AI service files
const files = [
  'services/aiAnalysis/sentimentAnalyzer.js',
  'services/aiAnalysis/riskPredictor.js', 
  'services/aiAnalysis/patternDetector.js',
  'services/aiAnalysis/insightGenerator.js'
];

files.forEach(fixFile);
console.log('✅ All AI services fixed');
