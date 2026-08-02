import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedPhone = localStorage.getItem('nyaya_user_phone');
        return savedPhone ? { phone: savedPhone } : null;
    });

    const login = (phone) => {
        localStorage.setItem('nyaya_user_phone', phone);
        setUser({ phone });
    };

    const logout = () => {
        localStorage.removeItem('nyaya_user_phone');
        localStorage.removeItem('nyaya_auth_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
