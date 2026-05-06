import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MdDashboard, MdPeople, MdFitnessCenter, MdLogout, MdOutlineSportsGymnastics, MdMenu, MdClose } from "react-icons/md";
import { useUserAuth } from "../../context/UserAuthContext";
import "./AdminSidebar.scss";

function AdminSidebar() {
    const location = useLocation();
    const { logOut } = useUserAuth();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logOut();
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const menuItems = [
        { name: "แดชบอร์ด", path: "/admin/dashboard", icon: <MdDashboard /> },
        { name: "จัดการผู้ใช้งาน", path: "/admin/users", icon: <MdPeople /> },
        { name: "จัดการโปรแกรม", path: "/admin/programs", icon: <MdFitnessCenter /> },
        { name: "จัดการท่าออกกำลังกาย", path: "/admin/exercises", icon: <MdOutlineSportsGymnastics /> },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button className="mobile-toggle-btn" onClick={toggleSidebar}>
                <MdMenu />
            </button>

            {/* Overlay for mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            <div className={`admin-sidebar ${isOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <span className="header-text">ระบบจัดการสำหรับผู้ดูแลระบบ</span>
                    <button className="close-btn" onClick={toggleSidebar}>
                        <MdClose />
                    </button>
                </div>

                <div className="sidebar-menu">
                    {menuItems.map((item) => {
                        const isActive = location.pathname.includes(item.path);
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`menu-item ${isActive ? "active" : ""}`}
                                onClick={() => setIsOpen(false)} // Close sidebar on link click (mobile)
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <span className="menu-text">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <MdLogout className="logout-icon" /> <span className="logout-text">ออกจากระบบ</span>
                    </button>
                </div>
            </div>
        </>
    );
}

export default AdminSidebar;
