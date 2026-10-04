import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());

// Configure your SMTP credentials here
// For Gmail, generate an App Password: Account Settings > Security > 2-Step Verification > App Passwords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vigneshwarlal@student.tce.edu', // Replace with your real Gmail
    pass: 'gcnc gwbl wjgz stel'             // Replace with your 16-digit App Password
  }
});

app.post('/api/send_email', async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required email fields' });
  }

  const mailOptions = {
    from: 'drdo.recruitment.bot@gmail.com', // Must match the user above
    to: to,
    subject: subject,
    text: text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email. Check credentials.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Standalone Mail Server running on http://localhost:${PORT}`);
});
