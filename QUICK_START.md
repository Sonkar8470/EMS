# Quick Start Guide - EMS MERN Stack

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all
```

### 2. Configure Environment
Create/update `backend/config.env`:
```env
NODE_ENV=development
PORT=3001
DATABASE=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/Employee
JWT_SECRET=your_secret_key_here
```

### 3. Start Development Servers
```bash
# Start both backend and frontend simultaneously
npm run dev
```

This will start:
- Backend API: http://localhost:3001
- Frontend App: http://localhost:5173

## 📁 Project Structure

```
EMS/
├── backend/                 # Express.js API server
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth & validation
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── config.env          # Environment variables
│   ├── package.json        # Backend dependencies
│   └── server.js           # Server entry point
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Auth context
│   │   ├── services/       # API service layer
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
└── package.json            # Root scripts
```

## 🔧 Key Features

### Backend (Express.js + MongoDB)
- **Authentication**: JWT-based auth with bcrypt
- **API Routes**: RESTful endpoints for users, attendance, WFH
- **Middleware**: Auth protection, CORS, validation
- **Database**: MongoDB with Mongoose ODM
- **Scheduling**: Auto-checkout cron job

### Frontend (React + TypeScript)
- **Authentication**: Context-based state management
- **API Integration**: Axios with interceptors
- **UI Components**: shadcn/ui + Tailwind CSS
- **Routing**: React Router with protected routes
- **Type Safety**: Full TypeScript support

## 🌐 API Endpoints

### Authentication
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `POST /api/users/logout` - User logout

### Attendance
- `POST /api/attendances/checkin` - Check in
- `POST /api/attendances/checkout` - Check out
- `GET /api/attendances/:employeeId` - Get attendance

### WFH
- `POST /api/wfh/request` - Request WFH
- `GET /api/wfh` - Get WFH requests
- `PUT /api/wfh/:id` - Update WFH status

## 🛠️ Development Commands

```bash
# Root level commands
npm run dev              # Start both servers
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run build           # Build frontend for production

# Backend commands
cd backend
npm run dev             # Start with nodemon
npm start               # Start production server

# Frontend commands
cd frontend
npm run dev             # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build
```

## 🔐 Authentication Flow

1. **Login**: User submits credentials → JWT token stored in localStorage
2. **API Calls**: Axios automatically includes token in Authorization header
3. **Protected Routes**: React Router checks auth context
4. **Token Expiry**: Automatic redirect to login on 401 responses

## 📊 Database Models

### User
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: String, // 'admin' or 'employee'
  employeeId: String
}
```

### Attendance
```javascript
{
  employeeId: String,
  date: String,
  inTime: String,
  outTime: String,
  workedHours: Number,
  status: String
}
```

### WFH
```javascript
{
  employeeId: String,
  date: String,
  reason: String,
  status: String // 'pending', 'approved', 'rejected'
}
```

## 🚀 Deployment

### Backend Deployment
1. Set environment variables on hosting platform
2. Deploy to Heroku/Railway/DigitalOcean
3. Update frontend API base URL

### Frontend Deployment
1. Build: `cd frontend && npm run build`
2. Deploy `dist` folder to Vercel/Netlify
3. Update API base URL in `src/services/api.ts`

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check connection string in `backend/config.env`
   - Ensure MongoDB Atlas IP whitelist includes your IP

2. **CORS Errors**
   - Backend CORS is configured for `http://localhost:5173`
   - Update in `backend/server.js` if using different port

3. **Authentication Issues**
   - Check JWT_SECRET in environment variables
   - Verify token storage in localStorage

4. **Port Conflicts**
   - Backend: 3001, Frontend: 5173
   - Update ports in respective config files if needed

## 📞 Support

For issues or questions:
1. Check the main README.md
2. Review API documentation
3. Check browser console and server logs
4. Create an issue in the repository
