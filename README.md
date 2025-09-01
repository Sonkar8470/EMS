# Employee Management System (EMS) - MERN Stack

A full-stack Employee Management System built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Project Structure

```
EMS/
├── backend/                 # Backend API server
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── config.env          # Environment variables
│   ├── package.json        # Backend dependencies
│   └── server.js           # Express server
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utility functions
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
└── README.md               # This file
```

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Employee Management**: Add, edit, delete, and view employee information
- **Attendance Tracking**: Check-in/check-out functionality with automatic time calculation
- **Work From Home (WFH)**: Request and manage WFH approvals
- **Dashboard**: Admin dashboard with charts and analytics
- **Employee Dashboard**: Individual employee dashboard with attendance history
- **Responsive Design**: Modern UI built with Tailwind CSS and shadcn/ui

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **cors** - Cross-origin resource sharing
- **node-cron** - Scheduled tasks

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **React Calendar** - Calendar component

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EMS
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**

   Create a `.env` file in the backend directory:
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/Employee
   JWT_SECRET=your_secret_key_here
   ```

5. **Start the Application**

   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```

   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `POST /api/users/logout` - User logout
- `GET /api/users/profile` - Get user profile

### Attendance
- `POST /api/attendances/checkin` - Check in
- `POST /api/attendances/checkout` - Check out
- `GET /api/attendances/:employeeId` - Get attendance by employee
- `GET /api/attendances` - Get all attendance records
- `PUT /api/attendances/:id` - Update attendance
- `DELETE /api/attendances/:id` - Delete attendance

### WFH
- `POST /api/wfh/request` - Request WFH
- `GET /api/wfh` - Get WFH requests
- `PUT /api/wfh/:id` - Update WFH status
- `DELETE /api/wfh/:id` - Delete WFH request

## Development

### Backend Development
- The backend uses ES modules
- MongoDB connection is handled in `server.js`
- Routes are organized by feature
- Middleware handles authentication and validation

### Frontend Development
- React components are organized by feature
- API calls are centralized in `services/api.ts`
- Authentication state is managed with React Context
- TypeScript provides type safety

### Database Schema

#### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  role: String, // 'admin' or 'employee'
  employeeId: String,
  mobile: String
}
```

#### Attendance Model
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

#### WFH Model
```javascript
{
  employeeId: String,
  date: String,
  reason: String,
  status: String, // 'pending', 'approved', 'rejected'
  approvedBy: String
}
```

## Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Deploy to platforms like Heroku, Railway, or DigitalOcean
3. Ensure MongoDB connection string is properly configured

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist` folder to platforms like Vercel, Netlify, or GitHub Pages
3. Update the API base URL in `services/api.ts` to point to your deployed backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@example.com or create an issue in the repository.
