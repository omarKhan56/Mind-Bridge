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

// Send counselor credentials email
const sendCounselorCredentials = async (counselorEmail, counselorName, password, collegeName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'mindbridge.platform@gmail.com',
      to: counselorEmail,
      subject: 'Welcome to MindBridge - Your Counselor Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">🧠 MindBridge</h1>
            <p style="color: #6B7280; margin: 5px 0;">Digital Mental Health Platform</p>
          </div>
          
          <div style="background: #F9FAFB; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1F2937; margin-top: 0;">Welcome to MindBridge, ${counselorName}!</h2>
            <p style="color: #4B5563; line-height: 1.6;">
              You have been added as a counselor for <strong>${collegeName}</strong>. 
              Your account has been created and you can now access the MindBridge platform to support students.
            </p>
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #4338CA; margin-top: 0;">Your Login Credentials</h3>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${counselorEmail}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #E5E7EB; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
            <p style="color: #DC2626; font-size: 14px; margin-top: 15px;">
              ⚠️ Please change your password after your first login for security.
            </p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1F2937;">Getting Started</h3>
            <ol style="color: #4B5563; line-height: 1.6;">
              <li>Log in to the MindBridge platform using your credentials</li>
              <li>Complete your counselor profile setup</li>
              <li>Review the counselor dashboard and available tools</li>
              <li>Start managing student appointments and support</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 14px;">
              If you have any questions, please contact the system administrator.
            </p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 15px;">
              This is an automated message from MindBridge Platform.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Credentials email sent to ${counselorEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send credentials email:', error);
    return false;
  }
};

module.exports = {
  sendLoginCredentials,
  sendCounselorCredentials
};
