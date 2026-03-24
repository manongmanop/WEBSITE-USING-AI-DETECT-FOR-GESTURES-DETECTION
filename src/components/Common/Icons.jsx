import React from 'react';

// Common Icon Wrapper to handle styling
const Icon = ({ children, size = 24, color = 'currentColor', className = '', viewBox = '0 0 24 24', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block ${className}`}
    {...props}
  >
    {children}
  </svg>
);

// Fill Icon Wrapper for solid icons
const FillIcon = ({ children, size = 24, color = 'currentColor', className = '', viewBox = '0 0 24 24', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={color}
    className={`inline-block ${className}`}
    {...props}
  >
    {children}
  </svg>
);

export const EmailIcon = (props) => (
  <FillIcon {...props}>
    <path d="M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,6L12,11L4,6V6L12,11L20,6M20,18H4V8L12,13L20,8V18Z" />
  </FillIcon>
);

export const LockIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13C13.11,13 14,13.89 14,15C14,16.1 13.11,17 12,17M18,8H17V6A5,5 0 0,0 12,1A5,5 0 0,0 7,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8M12,3A3,3 0 0,1 15,6V8H9V6A3,3 0 0,1 12,3M18,20H6V10H18V20Z" />
  </FillIcon>
);

export const VisibilityIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12,9C13.66,9 15,10.34 15,12C15,13.66 13.66,15 12,15C10.34,15 9,13.66 9,12C9,10.34 10.34,9 12,9M12,4.5C17,4.5 21.38,7.12 23,12C21.38,16.88 17,19.5 12,19.5C7,19.5 2.62,16.88 1,12C2.62,7.12 7,4.5 12,4.5M12,21C7.03,21 2.7,17.16 1,12C2.7,6.84 7.03,3 12,3C16.97,3 21.3,6.84 23,12C21.3,17.16 16.97,21 12,21Z" />
  </FillIcon>
);

export const VisibilityOffIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5,5-2.24,5-5-2.24-5-5-5zm0,8.13c-1.72,0-3.13-1.41-3.13-3.13s1.41-3.13,3.13-3.13,3.13,1.41,3.13,3.13-1.41,3.13-3.13,3.13zM12,4.5C7,4.5,2.73,7.61,1,12c1.73,4.39,6,7.5,11,7.5s9.27-3.11,11-7.5c-1.73-4.39-6-7.5-11-7.5zm0,13c-3.04,0-5.5-2.46-5.5-5.5S8.96,6.5,12,6.5s5.5,2.46,5.5,5.5-2.46,5.5-5.5,5.5z" />
    <path d="M2.71,3.16,1.41,4.47,4.42,7.48C2.96,8.73,1.73,10.25,1,12c1.73,4.39,6,7.5,11,7.5,1.55,0,3.03-.3,4.38-.84l4.13,4.13,1.3-1.3ZM12,16.5c-2.48,0-4.5-2.02-4.5-4.5,0-.56.12-1.09.32-1.58L13.58,16.18A4.47,4.47,0,0,1,12,16.5Z" />
    <path d="M7.94,5.44,9.35,6.85A10.65,10.65,0,0,1,12,6.5c5,0,9.27,3.11,11,7.5-.47,1.19-1.14,2.28-1.95,3.23l1.37,1.37a13.38,13.38,0,0,0,2.58-4.6c-1.73-4.39-6-7.5-11-7.5a12.8,12.8,0,0,0-5.06,1.02Z" />
  </FillIcon>
);

export const LoginIcon = (props) => (
  <FillIcon {...props}>
    <path d="M14,12L10,8V11H2V13H10V16L14,12M20,18H12V20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4H12V6H20V18Z" />
  </FillIcon>
);

export const PersonAddIcon = (props) => (
  <FillIcon {...props}>
    <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,9H3V11H2V13H3V15H5V13H7V11H5V9Z" />
  </FillIcon>
);

export const GoogleIcon = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={`inline-block ${className}`}
    {...props}
  >
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

export const SparklesIcon = (props) => (
  <FillIcon {...props}>
     <path d="M10 2.5a5 5 0 00-4.714 4.714L3 9h4.053l2.42-5.447A5 5 0 0010 2.5zM10 17.5a5 5 0 004.714-4.714L17 11h-4.053l-2.42 5.447A5 5 0 0010 17.5zM5 13a3 3 0 00-2.828 2.828L1 16.5h2.434l1.452-3.268A3 3 0 005 13zM15 5a3 3 0 00-2.828 2.828L11 9.5h2.434l1.452-3.268A3 3 0 0015 5z" />
  </FillIcon>
);

export const CheckIcon = (props) => (
  <FillIcon {...props}>
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </FillIcon>
);

export const HomeIcon = (props) => (
  <FillIcon {...props}>
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </FillIcon>
);

export const BarsIcon = (props) => (
  <FillIcon {...props}>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </FillIcon>
);

export const CloseIcon = (props) => (
  <FillIcon {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </FillIcon>
);

export const ChartLineIcon = (props) => (
  <FillIcon {...props}>
    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.09-4-4L2 17.08l1.5 1.41z" />
  </FillIcon>
);

export const HistoryIcon = (props) => (
  <FillIcon {...props}>
    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
  </FillIcon>
);

export const ExitIcon = (props) => (
  <FillIcon {...props}>
    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
  </FillIcon>
);

export const ArrowBackIcon = (props) => (
  <FillIcon {...props}>
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </FillIcon>
);

export const LockResetIcon = (props) => (
  <FillIcon {...props}>
    <path d="M13 3c-4.97 0-9 4.03-9 9H1l4 4 4-4H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.9 0-3.62-.76-4.88-1.99L6.7 18.42C8.3 20.02 10.53 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.09V8h-1.5z" />
  </FillIcon>
);

export const LockOutlineIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6zM18 20H6V10h12v10z" />
  </FillIcon>
);

export const PasswordIcon = (props) => (
  <FillIcon {...props}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-3-3l-1.41-1.41L12.17 17l-1.41-1.41L9.34 17l1.41 1.41L9.34 19.83l1.41 1.41 1.41-1.41 1.41 1.41 1.41-1.41L13.59 17 15 15.59z" />
  </FillIcon>
);

export const DashboardIcon = (props) => (
  <FillIcon {...props}>
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </FillIcon>
);

export const PeopleIcon = (props) => (
  <FillIcon {...props}>
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </FillIcon>
);

export const FitnessCenterIcon = (props) => (
  <FillIcon {...props}>
    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14 4.14 5.57 2 7.71 3.43 9.14 2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22 14.86 20.57 16.29 22 18.43 19.86 19.86 21.29 21.29 19.86 19.86 18.43 22 16.29 20.57 14.86z" />
  </FillIcon>
);

export const LogoutIcon = (props) => (
  <FillIcon {...props}>
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </FillIcon>
);

export const SportsGymnasticsIcon = (props) => (
  <FillIcon {...props}>
    <path d="M14 6c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zM4 11l2.5-4h11L20 11l-2 3-4-2v9h-2v-7h-2v7H8v-9L4 14l-2-3z" />
  </FillIcon>
);

export const EditIcon = (props) => (
  <FillIcon {...props}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </FillIcon>
);

export const EnvelopeIcon = (props) => (
  <FillIcon {...props}>
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </FillIcon>
);

export const ShieldAltIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </FillIcon>
);

export const VenusMarsIcon = (props) => (
  <FillIcon {...props}>
    <path d="M18.58 2.37l-1.41 1.41L18.59 5.2a5.95 5.95 0 0 0-4.54-1.2l-2.05-2.05a4 4 0 1 0-.71.71l2.05 2.05a5.96 5.96 0 1 0 5.24 1.4l1.41-1.41L18.58 2.37zM11 10a4 4 0 1 1-4-4 4 4 0 0 1 4 4z" />
  </FillIcon>
);

export const MarsIcon = (props) => (
  <FillIcon {...props}>
    <path d="M20 7V2h-5v2h2.58l-4.41 4.41A6 6 0 1 0 14.59 11.59L19 7.17V9.75h2V2h-5zM10 18a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
  </FillIcon>
);

export const VenusIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 2a6 6 0 0 0-1 11.92V17H9v2h2v3h2v-3h2v-2h-2v-3.08A6 6 0 0 0 12 2zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
  </FillIcon>
);

export const ToggleOffIcon = (props) => (
  <FillIcon {...props}>
    <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </FillIcon>
);

export const ToggleOnIcon = (props) => (
  <FillIcon {...props}>
    <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </FillIcon>
);

export const FireIcon = (props) => (
  <FillIcon {...props}>
    <path d="M13.5 14.5c0-2.32-3.62-5.74-3.62-5.74s-3.62 3.42-3.62 5.74c0 1.91 1.55 3.46 3.62 3.46s3.62-1.55 3.62-3.46zM20 12.5c0-5.93-8-11.5-8-11.5s-8 5.57-8 11.5c0 4.42 3.58 8 8 8s8-3.58 8-8z" />
  </FillIcon>
);

export const DumbbellIcon = (props) => (
  <FillIcon {...props}>
    <path d="M22 13h-2v-2h2v2zm-3-4V7a2 2 0 0 0-2-2h-3v4l-4-4V5H7a2 2 0 0 0-2 2v2H2v6h3v2a2 2 0 0 0 2 2h3v-4l4 4v4h3a2 2 0 0 0 2-2v-2h3V9z" />
  </FillIcon>
);

export const TrophyIcon = (props) => (
  <FillIcon {...props}>
    <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.94V19H7v2h10v-2h-4v-3.12c1.63-.31 2.98-1.44 3.61-2.94C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </FillIcon>
);

export const ChevronLeftIcon = (props) => (
  <FillIcon {...props}>
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
  </FillIcon>
);

export const ChevronRightIcon = (props) => (
  <FillIcon {...props}>
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
  </FillIcon>
);

export const PersonIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </FillIcon>
);

export const SupervisorAccountIcon = (props) => (
  <FillIcon {...props}>
    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </FillIcon>
);

export const AccessTimeIcon = (props) => (
  <FillIcon {...props}>
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
  </FillIcon>
);

export const LocalFireDepartmentIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 12.91c-.86-.9-1.36-2.11-1.36-3.41 0-1.3.5-2.51 1.36-3.41 1.29 1.41 2.08 3.27 2.08 5.32s-.79 3.91-2.08 5.32c-2.3-.39-4.32-2.15-5.35-4.59C5.58 13.96 5 15.65 5 17.5c0 3.87 3.13 7 7 7s7-3.13 7-7c0-2.19-1.01-4.14-2.58-5.42C15.48 11.1 13.88 10.1 12 10.1c-.81 0-1.59.18-2.28.5L8.41 9.35c.98-.56 2.11-.85 3.59-.85 3.04 0 5.5 2.46 5.5 5.5s-2.46 5.5-5.5 5.5-5.5-2.46-5.5-5.5 2.46-5.5 5.5-5.5c.34 0 .68.03 1 .09l-.8-2.3c-.07-.01-.14-.02-.2-.02-4.14 0-7.5 3.36-7.5 7.5S7.36 21.5 11.5 21.5s7.5-3.36 7.5-7.5c0-1.13-.25-2.19-.69-3.16L12 12.91z" />
  </FillIcon>
);

export const SearchIcon = (props) => (
  <FillIcon {...props}>
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </FillIcon>
);

export const LightningIcon = (props) => (
  <FillIcon {...props}>
    <path d="M7 2v11h3v9l7-12h-4l4-8H7z" />
  </FillIcon>
);

export const ArrowRightIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
  </FillIcon>
);

export const ArrowForwardIcon = (props) => (
  <FillIcon {...props}>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </FillIcon>
);

export const HeightIcon = (props) => (
  <FillIcon {...props}>
    <path d="M13 6.99h3L12 3 8 6.99h3v10.02H8L12 21l4-3.99h-3z" />
  </FillIcon>
);

export const FaceIcon = (props) => (
  <FillIcon {...props}>
    <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.58-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z" />
  </FillIcon>
);

export const Face3Icon = (props) => (
  <FillIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.58-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z" />
  </FillIcon>
);

export const SaveIcon = (props) => (
  <FillIcon {...props}>
    <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
  </FillIcon>
);

export const AdminPanelSettingsIcon = (props) => (
  <FillIcon {...props}>
    <path d="M12 21.35s-8-4.46-8-10.35V5l8-3 8 3v6c0 5.89-8 10.35-8 10.35zM12 13c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-.5c0-2.33-4.67-3.5-7-3.5z" />
  </FillIcon>
);

export const FormatListBulletedIcon = (props) => (
  <FillIcon {...props}>
    <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
  </FillIcon>
);
