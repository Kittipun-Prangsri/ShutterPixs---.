require('dotenv').config();
const line = require('@line/bot-sdk');

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

async function testPush() {
  const adminUserId = process.env.LINE_ADMIN_USER_ID;
  console.log('Testing LINE Push Message to admin user:', adminUserId);
  
  if (!adminUserId) {
    console.error('❌ LINE_ADMIN_USER_ID is missing in .env');
    return;
  }

  try {
    const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: lineConfig.channelAccessToken });
    
    const result = await client.pushMessage({
      to: adminUserId,
      messages: [
        {
          type: 'text',
          text: '🔔 ข้อความทดสอบเชื่อมต่อระบบ ShutterPixs!'
        }
      ]
    });
    
    console.log('✅ Push message sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Push message FAILED!');
    console.error('Error Details:', err.message);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testPush();
