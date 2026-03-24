import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  DashboardIcon, 
  PeopleIcon, 
  FitnessCenterIcon, 
  LogoutIcon, 
  SportsGymnasticsIcon 
} from "../Common/Icons";
import { useUserAuth } from "../../context/UserAuthContext";
import "./AdminSidebar.scss";

function AdminSidebar() {
    const location = useLocation();
    const { logOut } = useUserAuth();

    const handleLogout = async () => {
        try {
            await logOut();
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const menuItems = [
        { name: "แดชบอร์ด", path: "/admin/dashboard", icon: <DashboardIcon /> },
        { name: "จัดการผู้ใช้งาน", path: "/admin/users", icon: <PeopleIcon /> },
        { name: "จัดการโปรแกรม", path: "/admin/programs", icon: <FitnessCenterIcon /> },
        { name: "จัดการท่าออกกำลังกาย", path: "/admin/exercises", icon: <SportsGymnasticsIcon /> },
    ];

    return (
        <div className="admin-sidebar">
            <div className="sidebar-header">
                ระบบจัดการสำหรับผู้ดูแลระบบ
            </div>

            <div className="sidebar-menu">
                {menuItems.map((item) => {
                    const isActive = location.pathname.includes(item.path);
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`menu-item ${isActive ? "active" : ""}`}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={handleLogout}>
                    <LogoutIcon className="logout-icon" /> ออกจากระบบ
                </button>
            </div>
        </div>
    );
}

export default AdminSidebar;
