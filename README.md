# MindBridge - Digital Psychological Intervention System

A comprehensive mental health support platform designed specifically for college students, featuring AI-guided support, confidential counseling, peer forums, and administrative analytics.

## 🌟 Features

### Core Functionality
- **AI-Guided First-Aid Support**: 24/7 interactive chat with coping strategies and professional referrals
- **Confidential Booking System**: Anonymous appointment scheduling with counselors
- **Psychoeducational Resource Hub**: Curated videos, audio guides, and wellness materials
- **Peer Support Platform**: Moderated forums with trained student volunteers
- **Mental Health Screening**: Evidence-based tools (PHQ-9, GAD-7, GHQ-12)
- **Admin Dashboard**: Real-time analytics and intervention planning

### Key Benefits
- **Stigma-Free Environment**: Complete anonymity options
- **Cultural Sensitivity**: Multi-language support and regional customization
- **Evidence-Based**: Uses standardized psychological screening tools
- **Data-Driven**: Anonymous analytics for institutional planning
- **Scalable**: Designed for institutions of all sizes

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time chat
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Google Gemini AI** for intelligent chat responses
- **Inngest** for workflow automation and event processing

### Frontend
- **React.js** with functional components and hooks
- **React Router** for navigation
- **Axios** for API communication
- **Socket.io-client** for real-time features
- **Framer Motion** for smooth animations and transitions
- **CSS3** with responsive design

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mindBridge
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm run install-all

# Or install manually:
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Database Setup
```bash
# Start MongoDB service
mongod

# Create database (MongoDB will create it automatically on first connection)
```

### 4. Environment Configuration
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit server/.env with your configuration:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mindbridge
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
GEMINI_API_KEY=your-google-gemini-api-key-here
INNGEST_EVENT_KEY=your-inngest-event-key-here
INNGEST_SIGNING_KEY=your-inngest-signing-key-here
```

**Required API Keys:**
- **Google Gemini API**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Inngest Keys**: Sign up at [Inngest.com](https://inngest.com) for workflow automation

### 5. Start the Application
```bash
# Development mode (runs both server and client)
npm run dev

# Or start separately:
npm run server  # Backend on http://localhost:5000
npm run client  # Frontend on http://localhost:3000
```

## 📊 Database Schema

### User Model
- Personal information (name, email, department, year)
- Psychological screening data (PHQ-9, GAD-7, GHQ scores)
- Risk level classification
- Activity tracking

### Appointment Model
- Student and counselor references
- Scheduling details (date, duration, type, mode)
- Status tracking and notes
- Anonymous booking support

### Resource Model
- Multimedia content (videos, audio, articles)
- Categorization and tagging
- Usage analytics and ratings
- Multi-language support

### Forum Model
- Anonymous posting and replies
- Moderation system
- Category-based organization
- Engagement tracking

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Data Anonymization**: Complete privacy protection
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests

## 👥 User Roles

### Students
- Complete mental health screenings
- Access AI chat support
- Book counseling appointments
- Browse resources and participate in forums
- View personal dashboard and progress

### Counselors
- Manage appointment schedules
- Access student data (with permission)
- Moderate forum content
- Create and manage resources

### Administrators
- View system-wide analytics
- Manage user accounts and appointments
- Export anonymized research data
- Configure system settings

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/screening` - Update screening data

### Appointments
- `GET /api/appointments/my-appointments` - User appointments
- `POST /api/appointments/book` - Book new appointment
- `GET /api/appointments/available-slots` - Available time slots

### Resources
- `GET /api/resources` - Browse resources
- `GET /api/resources/:id` - Get specific resource
- `POST /api/resources/:id/rate` - Rate resource

### Forum
- `GET /api/forum` - Get forum posts
- `POST /api/forum` - Create new post
- `POST /api/forum/:id/reply` - Add reply to post

### Admin
- `GET /api/admin/dashboard` - Dashboard analytics
- `GET /api/admin/appointments` - All appointments
- `GET /api/admin/export/research-data` - Export anonymized data

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: WCAG compliant design
- **Dark/Light Mode**: User preference support
- **Intuitive Navigation**: Clear information architecture
- **Visual Feedback**: Loading states and success/error messages

## 📈 Analytics & Reporting

### Student Analytics
- Mental health screening trends
- Resource usage patterns
- Appointment attendance rates
- Forum engagement metrics

### Institutional Analytics
- Department-wise mental health distribution
- Risk level trends over time
- Resource effectiveness analysis
- Intervention success rates

## 🔧 Configuration Options

### Environment Variables
```env
PORT=5000                                    # Server port
MONGODB_URI=mongodb://localhost:27017/mindbridge  # Database connection
JWT_SECRET=your-secret-key                   # JWT signing key
NODE_ENV=development                         # Environment mode
```

### Customization
- **Branding**: Update colors, logos, and institution name
- **Languages**: Add new language support in resources
- **Screening Tools**: Modify or add psychological assessments
- **Categories**: Customize resource and forum categories

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure MongoDB Atlas or production database
4. Set up SSL certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging

### Docker Deployment
```dockerfile
# Dockerfile example for containerization
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# Integration tests
npm run test:integration
```

### Test Coverage
- Unit tests for all API endpoints
- Component testing for React components
- Integration tests for user workflows
- Security testing for authentication

## 📚 Documentation

### API Documentation
- Swagger/OpenAPI documentation available at `/api/docs`
- Postman collection for testing endpoints

### User Guides
- Student user manual
- Counselor administration guide
- System administrator handbook

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [Issues](issues) page for common problems
- Review the documentation in `/docs`
- Contact the development team

### Reporting Issues
- Use the GitHub issue tracker
- Provide detailed reproduction steps
- Include system information and logs

## 🔮 Future Enhancements

### Planned Features
- **Mobile App**: Native iOS and Android applications
- **AI Improvements**: Advanced NLP for better chat responses
- **Telehealth Integration**: Video counseling capabilities
- **Wearable Integration**: Stress monitoring from fitness devices
- **Machine Learning**: Predictive analytics for early intervention

### Research Opportunities
- Effectiveness studies of digital interventions
- Usage pattern analysis for optimization
- Cross-institutional comparative studies
- Long-term outcome tracking

## 📞 Emergency Resources

**Important**: This system is not a replacement for emergency mental health services.

### Crisis Resources
- **National Suicide Prevention Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **Emergency Services**: 911

### Campus Resources
- Campus Counseling Center
- Student Health Services
- Dean of Students Office
- Campus Safety

---

**MindBridge** - Bridging the gap between students and mental health support through technology, compassion, and evidence-based care.
