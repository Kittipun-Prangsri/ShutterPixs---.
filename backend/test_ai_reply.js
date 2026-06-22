require('dotenv').config();
const aiService = require('./services/aiService');

async function run() {
  console.log('Sending message to AI...');
  try {
    const reply = await aiService.generateResponse('สอบถาม');
    console.log('Response:', reply);
  } catch (err) {
    console.error('Test error:', err);
  }
}

run();
