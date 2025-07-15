// 🚀 ADMIN SETUP UTILITY FOR CENTRE MART
// Use this to set up admin users in Firebase

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const setupAdminUser = async(userUid, adminData = {}) => {
    try {
        // Check if user exists
        const userDoc = await getDoc(doc(db, 'users', userUid));

        if (!userDoc.exists()) {
            throw new Error('User does not exist. Please create the user account first.');
        }

        // Update user with admin role
        await setDoc(doc(db, 'users', userUid), {
            ...userDoc.data(),
            role: 'admin',
            adminSince: new Date(),
            adminPermissions: [
                'manage_products',
                'manage_orders',
                'manage_customers',
                'view_analytics',
                'manage_inventory',
                'manage_settings'
            ],
            ...adminData
        }, { merge: true });

        console.log('✅ Admin user setup successful!');
        return true;
    } catch (error) {
        console.error('❌ Admin setup failed:', error);
        throw error;
    }
};

export const removeAdminRole = async(userUid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userUid));

        if (!userDoc.exists()) {
            throw new Error('User does not exist.');
        }

        // Remove admin role
        await setDoc(doc(db, 'users', userUid), {
            ...userDoc.data(),
            role: 'user',
            adminSince: null,
            adminPermissions: []
        }, { merge: true });

        console.log('✅ Admin role removed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Remove admin failed:', error);
        throw error;
    }
};

export const checkAdminStatus = async(userUid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userUid));

        if (!userDoc.exists()) {
            return { isAdmin: false, user: null };
        }

        const userData = userDoc.data();
        return {
            isAdmin: userData.role === 'admin',
            user: userData
        };
    } catch (error) {
        console.error('❌ Check admin status failed:', error);
        return { isAdmin: false, user: null };
    }
};

// Example usage:
// 1. First create a regular user account through your app
// 2. Get their UID from Firebase Auth
// 3. Run: setupAdminUser('user-uid-here')
// 4. Now they can access admin panel with their email/password