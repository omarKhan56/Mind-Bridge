const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, use a test account or fallback
  if (process.env.NODE_ENV === 'development' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
    // Return a mock transporter for development
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 Mock Email Sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.html.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
        return { messageId: 'mock-message-id' };
      }
    };
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send login credentials email
const sendLoginCredentials = async (studentEmail, studentName, password) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@mindbridge.com',
      to: studentEmail,
      subject: 'MindBridge - Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to MindBridge</h2>
          <p>Dear ${studentName},</p>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${studentEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after your first login for security.</p>
          
          <p>You can access MindBridge at: <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}">${process.env.CLIENT_URL || 'http://localhost:3000'}</a></p>
          
          <p>If you have any questions, please contact your counselor.</p>
          
          <p>Best regards,<br>MindBridge Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Login credentials email sent successfully to:', studentEmail);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

module.exports = {
  sendLoginCredentials
};
