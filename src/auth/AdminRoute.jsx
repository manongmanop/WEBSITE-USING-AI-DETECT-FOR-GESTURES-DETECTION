import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
// import { doc, getDoc } from 'firebase/firestore';
// import { db } from '../../firebase';

function AdminRoute({ children }) {
    const { user, loading: globalLoading, db } = useUserAuth();
    const [isAdmin, setIsAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (globalLoading) return; // Wait for Firebase Auth

            if (user) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const docRef = doc(db, 'admin', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists() && docSnap.data().role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        };

        checkAdminStatus();
    }, [user, globalLoading]);

    if (globalLoading || loading) {
        return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>กำลังตรวจสอบสิทธิ์...</div>
        </div>;
    }

    if (!user || !isAdmin) {
        return <Navigate to="/home" />;
    }

    return children;
}

export default AdminRoute;
