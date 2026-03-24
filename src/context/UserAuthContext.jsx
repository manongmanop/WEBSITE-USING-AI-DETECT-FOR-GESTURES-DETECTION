import React, { createContext, useContext, useEffect, useState } from 'react'

const userAuthContext = createContext();

export function UserAuthContextProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);

    // Initial check - defer loading until needed or until we suspect a session
    useEffect(() => {
        const init = async () => {
            try {
                const { initFirebase } = await import('../../firebase');
                const initialized = await initFirebase();
                setAuth(initialized.auth);
                setDb(initialized.db);

                const { onAuthStateChanged } = await import("firebase/auth");
                const unsubscribe = onAuthStateChanged(initialized.auth, (currentuser) => {
                    console.log("Auth", currentuser);
                    setUser(currentuser);
                    setLoading(false);
                });
                return () => unsubscribe();
            } catch (err) {
                console.error("Firebase init error:", err);
                setLoading(false);
            }
        };
        init();
    }, []);

    async function logIn(email, password) {
        const { initFirebase } = await import('../../firebase');
        const { auth } = await initFirebase();
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function signUp(email, password) {
        const { initFirebase } = await import('../../firebase');
        const { auth } = await initFirebase();
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        return createUserWithEmailAndPassword(auth, email, password);
    }

    async function logOut() {
        const { initFirebase } = await import('../../firebase');
        const { auth } = await initFirebase();
        const { signOut } = await import("firebase/auth");
        return signOut(auth);
    }

    async function googleSignIn() {
        const { initFirebase } = await import('../../firebase');
        const { auth } = await initFirebase();
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const googleProvider = new GoogleAuthProvider();
        return signInWithPopup(auth, googleProvider);
    }

    async function resetPassword(email) {
        const { initFirebase } = await import('../../firebase');
        const { auth } = await initFirebase();
        const { sendPasswordResetEmail } = await import("firebase/auth");
        return sendPasswordResetEmail(auth, email);
    }

    return (
        <userAuthContext.Provider value={{ user, logIn, signUp, logOut, googleSignIn, resetPassword, loading, auth, db }}>
            {children}
        </userAuthContext.Provider>
    )
}

export function useUserAuth() {
    return useContext(userAuthContext);
}