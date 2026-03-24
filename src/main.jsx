import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { UserAuthContextProvider } from "./context/UserAuthContext.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "/index.css";

// -------- Lazy Load ทุกหน้า --------

// Public
const LandingPage = React.lazy(() => import("./components/LandingPage/LandingPage.jsx"));
const Login = React.lazy(() => import("./components/Login.jsx"));
const Register = React.lazy(() => import("./components/Register.jsx"));
const ForgotPassword = React.lazy(() => import("./components/ForgotPassword.jsx"));
const TermsOfService = React.lazy(() => import("./components/Legal/TermsOfService.jsx"));
const PrivacyPolicy = React.lazy(() => import("./components/Legal/PrivacyPolicy.jsx"));

// Auth
const ProtectedRoute = React.lazy(() => import("./auth/ProtectedRoute.jsx"));
const AdminRoute = React.lazy(() => import("./auth/AdminRoute.jsx"));

// Main
const Main = React.lazy(() => import("./components/Website/Main.jsx"));
const Account = React.lazy(() => import("./components/Account Section/Account.jsx"));
const AddInfo = React.lazy(() => import("./components/Website/AddInfo.jsx"));
const UpdateInfo = React.lazy(() => import("./components/Website/UpdateInfo.jsx"));
const Detail = React.lazy(() => import("./components/Detail Section/Detail/Detail.jsx"));

// Workout
const WorkoutPlayer = React.lazy(() => import("./components/WorkoutPlay/WorkoutPlayer.jsx"));
const SummaryProgram = React.lazy(() => import("./components/WorkoutPlay/SummaryProgram.jsx"));
const WorkoutHistory = React.lazy(() => import("./components/WorkoutPlay/WorkoutHistory.jsx"));

// Pose Detector (หนักมาก ควร lazy)
const PoseDetector = React.lazy(() => import("./PoseDetector.jsx"));
const Dumbbell = React.lazy(() => import("./Dumbbell.jsx"));
const Hipe_Raise = React.lazy(() => import("./Hipe_Raise.jsx"));
const Leg_Raises = React.lazy(() => import("./Leg_Raises.jsx"));
const Plank = React.lazy(() => import("./Plank.jsx"));
const Push_ups = React.lazy(() => import("./Push_ups.jsx"));
const Squat = React.lazy(() => import("./Squat.jsx"));

// Onboarding
const Onboarding = React.lazy(() => import("./components/Onboarding/Onboarding.jsx"));
const LinkEmailPassword = React.lazy(() => import("./components/LinkEmailPassword.jsx"));

// Admin
const AdminLayout = React.lazy(() => import("./components/Admin/AdminLayout.jsx"));
const AdminDashboard = React.lazy(() => import("./components/Admin/Dashboard/AdminDashboard.jsx"));
const UserManagement = React.lazy(() => import("./components/Admin/Users/UserManagement.jsx"));
const UserProgress = React.lazy(() => import("./components/Admin/Users/UserProgress.jsx"));
const ProgramManagement = React.lazy(() => import("./components/Admin/Programs/ProgramManagement.jsx"));
const AddProgram = React.lazy(() => import("./components/Admin/Programs/AddProgram.jsx"));
const EditProgram = React.lazy(() => import("./components/Admin/Programs/EditProgram.jsx"));
const ExerciseManagement = React.lazy(() => import("./components/Admin/Exercises/ExerciseManagement.jsx"));
const AddExercise = React.lazy(() => import("./components/Admin/Exercises/AddExercise.jsx"));
const EditExercise = React.lazy(() => import("./components/Admin/Exercises/EditExercise.jsx"));

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/terms", element: <TermsOfService /> },
  { path: "/privacy", element: <PrivacyPolicy /> },

  { path: "/home", element: <ProtectedRoute><Main /></ProtectedRoute> },
  { path: "/profile", element: <ProtectedRoute><Account /></ProtectedRoute> },
  { path: "/addinfo", element: <ProtectedRoute><AddInfo /></ProtectedRoute> },
  { path: "/updateinfo", element: <ProtectedRoute><UpdateInfo /></ProtectedRoute> },

  { path: "/detail/:id", element: <ProtectedRoute><Detail /></ProtectedRoute> },

  { path: "/WorkoutPlayer/:programId", element: <ProtectedRoute><WorkoutPlayer /></ProtectedRoute> },
  { path: "/summary/program/:uid", element: <ProtectedRoute><SummaryProgram /></ProtectedRoute> },
  { path: "/history/:uid", element: <ProtectedRoute><WorkoutHistory /></ProtectedRoute> },

  { path: "/PoseDetector", element: <ProtectedRoute><PoseDetector /></ProtectedRoute> },
  { path: "/Dumbbell", element: <ProtectedRoute><Dumbbell /></ProtectedRoute> },
  { path: "/Hipe_Raise", element: <ProtectedRoute><Hipe_Raise /></ProtectedRoute> },
  { path: "/Leg_Raises", element: <ProtectedRoute><Leg_Raises /></ProtectedRoute> },
  { path: "/Plank", element: <ProtectedRoute><Plank /></ProtectedRoute> },
  { path: "/Push_ups", element: <ProtectedRoute><Push_ups /></ProtectedRoute> },
  { path: "/Squat", element: <ProtectedRoute><Squat /></ProtectedRoute> },

  { path: "/onboarding", element: <ProtectedRoute><Onboarding /></ProtectedRoute> },
  { path: "/set-password", element: <ProtectedRoute><LinkEmailPassword /></ProtectedRoute> },

  {
    path: "/admin",
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "users", element: <UserManagement /> },
      { path: "users/progress/:uid", element: <UserProgress /> },
      { path: "programs", element: <ProgramManagement /> },
      { path: "programs/add", element: <AddProgram /> },
      { path: "programs/edit/:id", element: <EditProgram /> },
      { path: "exercises", element: <ExerciseManagement /> },
      { path: "exercises/add", element: <AddExercise /> },
      { path: "exercises/edit/:id", element: <EditExercise /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UserAuthContextProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </UserAuthContextProvider>
  </React.StrictMode>
);