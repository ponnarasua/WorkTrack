# 🚀 WorkTrack

A production-ready, enterprise-grade task management system designed for organizations. Built with modern web technologies, WorkTrack provides comprehensive task tracking, team collaboration, and productivity analytics with enterprise-level security.

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.14.2-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

### 📋 **Task Management**
- ✅ Create, update, and delete tasks with rich descriptions
- ✅ Priority levels (Low, Medium, High) with color coding
- ✅ Status tracking (Pending, In Progress, Completed)
- ✅ Due date management with automated reminders
- ✅ Multi-user assignment and collaboration
- ✅ Todo checklists within tasks
- ✅ File attachments via Cloudinary integration
- ✅ Labels/tags for categorization

### 💬 **Collaboration**
- ✅ Real-time comments on tasks
- ✅ @mentions with email notifications
- ✅ Activity logs (13 tracked action types)
- ✅ User search and filtering
- ✅ Team productivity charts

### 🔔 **Notifications & Reminders**
- ✅ Email notifications for task assignments
- ✅ Automated due date reminders (cron-scheduled)
- ✅ In-app notification system with unread counts
- ✅ Mention notifications

### 📊 **Reports & Analytics**
- ✅ Excel export (ExcelJS)
- ✅ PDF reports with charts (PDFKit)
- ✅ Productivity statistics
- ✅ Task distribution charts (Recharts)
- ✅ User performance metrics

### 🔐 **Security & Authentication**
- ✅ JWT authentication with httpOnly cookies
- ✅ OTP verification (registration, password reset, account deletion)
- ✅ bcrypt password hashing
- ✅ Rate limiting (login, registration, API)
- ✅ Helmet.js security headers
- ✅ Input sanitization (XSS protection)
- ✅ CORS configuration
- ✅ Domain-based access control

### 🎨 **User Experience**
- ✅ Dark mode support
- ✅ Responsive design (mobile-friendly)
- ✅ Toast notifications
- ✅ Error boundaries
- ✅ Loading states with Suspense
- ✅ Code-split lazy loading

## 🏗️ Architecture

### **Tech Stack**

#### **Frontend**
- **Framework:** React 19.1.0
- **Build Tool:** Vite 6.3.5
- **Styling:** Tailwind CSS 4.1.6
- **State Management:** React Query 5.90.12, Context API
- **Routing:** React Router 7.6.0
- **HTTP Client:** Axios 1.9.0
- **Charts:** Recharts 2.15.3
- **Notifications:** React Hot Toast 2.5.2
- **Icons:** React Icons 5.5.0

#### **Backend**
- **Runtime:** Node.js
- **Framework:** Express 5.1.0
- **Database:** MongoDB (Mongoose 8.14.2)
- **Authentication:** JSON Web Tokens (JWT 9.0.2)
- **Security:** Helmet 8.1.0, bcrypt 6.0.0
- **Logging:** Winston 3.19.0
- **Email:** Nodemailer 7.0.11
- **File Upload:** Multer 1.4.5, Cloudinary 2.7.0
- **Scheduling:** Node-Cron 4.2.1
- **Rate Limiting:** Express Rate Limit 8.2.1
- **Compression:** Compression 1.8.1

### **Project Structure**
```
WorkTrack/
├── backend/
│   ├── config/           # Database, Cloudinary, Winston logger
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Auth, rate limiting, upload, domain
│   ├── models/           # Mongoose schemas (User, Task, Notification, OTP)
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic layer
│   ├── utils/            # Helpers (email, validation, response, etc.)
│   └── server.js         # Application entry point
│
└── frontend/Task-Manager/
    ├── public/           # Static assets
    └── src/
        ├── assets/       # Images
        ├── components/   # Reusable UI components
        ├── context/      # React Context (User, Theme)
        ├── hooks/        # Custom React hooks
        ├── pages/        # Route components (Admin, User, Auth)
        ├── routes/       # Private route protection
        └── utils/        # API paths, axios, logger, helpers
```

## 🚀 Getting Started

### **Prerequisites**

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (v6.0+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Cloudinary account (for file uploads)
- SMTP email account (for notifications)

### **Installation**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ponnarasua/WorkTrack.git
   cd WorkTrack
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend/Task-Manager
   npm install
   ```

### **Environment Configuration**

#### **Backend (.env)**
Create `backend/.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/worktrack

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS (optional - comma-separated origins)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**📝 Note:** Refer to `backend/ENVIRONMENT_VARIABLES_TEMPLATE.md` for detailed guidance.

#### **Frontend (.env)**
Create `frontend/Task-Manager/.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### **Running the Application**

#### **Development Mode**

1. **Start MongoDB:**
   ```bash
   # Linux/Mac
   mongod
   
   # Windows
   # MongoDB should be running as a service
   ```

2. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on: `http://localhost:5000`

3. **Start the frontend (new terminal):**
   ```bash
   cd frontend/Task-Manager
   npm run dev
   ```
   Frontend runs on: `http://localhost:5173`

4. **Access the application:**
   - Open browser: `http://localhost:5173`
   - Register a new account
   - First user with organization domain becomes admin

#### **Production Build**

**Frontend:**
```bash
cd frontend/Task-Manager
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm start
```

## 🔒 Security Features

### **Implemented Security Measures:**
- ✅ **httpOnly Cookies:** JWT tokens stored securely, protected from XSS
- ✅ **Helmet.js:** Security headers (CSP, X-Frame-Options, etc.)
- ✅ **Rate Limiting:** 
  - Login: 10 attempts per 2 minutes
  - Registration: 10 attempts per 15 minutes
  - API: 100 requests per 15 minutes
  - Sensitive operations: 10 requests per 15 minutes
- ✅ **Input Sanitization:** XSS protection on all user inputs
- ✅ **Password Hashing:** bcrypt with salt rounds
- ✅ **Environment Validation:** Required variables checked on startup
- ✅ **CORS Protection:** Configurable allowed origins
- ✅ **Trust Proxy:** Proper IP detection behind reverse proxies

### **Security Checklist:**
Before deploying to production, ensure:
- [ ] All environment variables are set
- [ ] Strong JWT_SECRET generated (use `openssl rand -base64 32`)
- [ ] HTTPS enabled
- [ ] CORS origins restricted to production domains
- [ ] Email credentials secured (use app-specific passwords)
- [ ] MongoDB authentication enabled
- [ ] Cloudinary API keys rotated regularly

## 📊 Database Schema

### **Collections:**
- **Users:** Authentication, profiles, roles (Admin/User)
- **Tasks:** Task details, checklists, attachments, labels
- **Notifications:** In-app notifications with read status
- **OTPs:** Time-limited verification codes

### **Indexes (8 total):**
- `assignedTo`, `status`, `createdBy`, `dueDate`
- `assignedTo + status`, `status + dueDate`
- `labels`, `reminderSent + dueDate`

## 📝 API Documentation

### **Authentication Endpoints**
```
POST   /api/auth/register              # Register new user
POST   /api/auth/login                 # Login user
POST   /api/auth/logout                # Logout user
GET    /api/auth/profile               # Get user profile
PUT    /api/auth/profile               # Update user profile
POST   /api/auth/send-registration-otp # Send registration OTP
POST   /api/auth/verify-registration-otp # Verify registration OTP
POST   /api/auth/forgot-password       # Request password reset
POST   /api/auth/reset-password        # Reset password with OTP
POST   /api/auth/delete-account-request # Request account deletion
POST   /api/auth/confirm-delete-account # Confirm account deletion
POST   /api/auth/upload-image          # Upload profile image
```

### **Task Endpoints**
```
GET    /api/tasks                      # Get all tasks (filtered)
POST   /api/tasks                      # Create new task (Admin)
GET    /api/tasks/search               # Search tasks
GET    /api/tasks/statistics           # Get task statistics
GET    /api/tasks/labels               # Get all labels
GET    /api/tasks/:id                  # Get task by ID
PUT    /api/tasks/:id                  # Update task
DELETE /api/tasks/:id                  # Delete task
PUT    /api/tasks/:id/status           # Update task status
PUT    /api/tasks/:id/todo             # Update todo checklist
POST   /api/tasks/:id/comments         # Add comment
DELETE /api/tasks/:id/comments/:commentId # Delete comment
POST   /api/tasks/:id/labels           # Add label
DELETE /api/tasks/:id/labels/:label    # Remove label
POST   /api/tasks/:id/send-reminder    # Send reminder email
```

### **User Endpoints**
```
GET    /api/users                      # Get all users (Admin)
GET    /api/users/search               # Search users
GET    /api/users/:id                  # Get user by ID
PUT    /api/users/:id                  # Update user
DELETE /api/users/:id                  # Delete user (Admin)
```

### **Notification Endpoints**
```
GET    /api/notifications              # Get all notifications
GET    /api/notifications/unread-count # Get unread count
PUT    /api/notifications/:id/read     # Mark as read
PUT    /api/notifications/mark-all-read # Mark all as read
DELETE /api/notifications/:id          # Delete notification
```

### **Report Endpoints**
```
GET    /api/reports/generate-excel     # Generate Excel report
GET    /api/reports/generate-pdf       # Generate PDF report
```

## 🎯 Usage

### **Admin Features:**
- Create and assign tasks to team members
- Manage users (view, update, delete)
- View team productivity analytics
- Generate reports (Excel/PDF)
- Manage organization settings

### **User Features:**
- View assigned tasks with filtering (status, priority)
- Update task status and progress
- Add comments and @mention colleagues
- Upload attachments
- Manage todo checklists
- View personal productivity stats
- Receive email notifications

## 🐛 Troubleshooting

### **Backend won't start:**
- Check if MongoDB is running
- Verify all required environment variables are set
- Check port 5000 is not in use: `lsof -i :5000` (Mac/Linux)

### **Frontend can't connect to backend:**
- Ensure backend is running on port 5000
- Check VITE_API_BASE_URL in frontend/.env
- Verify CORS settings in backend

### **Email notifications not sending:**
- Verify EMAIL_* credentials in .env
- For Gmail, use [App Password](https://support.google.com/accounts/answer/185833)
- Check spam folder

### **File uploads failing:**
- Verify Cloudinary credentials
- Check file size limits (default: 5MB)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### **Coding Standards:**
- Use ES6+ JavaScript features
- Follow existing code structure
- Add comments for complex logic
- Use Winston for backend logging
- Use the custom logger for frontend logging
- Sanitize all user inputs
- Include proper error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Ponnarasu**
- GitHub: [@ponnarasua](https://github.com/ponnarasua)

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js community
- MongoDB team
- All open-source contributors

## 📞 Support

For support, email your-email@example.com or open an issue in this repository.

---

**⭐ If you find this project helpful, please give it a star!**
