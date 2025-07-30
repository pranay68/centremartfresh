// 🚀 LENNOX CENTER MART - SMART USER DATA MANAGER

import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

class UserDataManager {
    constructor() {
        this.guestId = this.getGuestId();
    }

    // Generate or get guest user ID
    getGuestId() {
        let guestId = localStorage.getItem('centremart_guest_id');
        if (!guestId) {
            guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('centremart_guest_id', guestId);
        }
        return guestId;
    }

    // Save data for signed-in user
    async saveToFirebase(userId, dataType, data) {
        try {
            const userRef = doc(db, 'users', userId);

            switch (dataType) {
                case 'cart':
                    await updateDoc(userRef, { cart: data });
                    break;
                case 'wishlist':
                    await updateDoc(userRef, { wishlist: data });
                    break;
                case 'recentlyViewed':
                    await updateDoc(userRef, {
                        recentlyViewed: arrayUnion({
                            productId: data.productId,
                            viewedAt: new Date()
                        })
                    });
                    break;
                case 'addresses':
                    await updateDoc(userRef, { addresses: data });
                    break;
                case 'orders':
                    await updateDoc(userRef, {
                        orders: arrayUnion({
                            ...data,
                            createdAt: new Date()
                        })
                    });
                    break;
                default:
                    await updateDoc(userRef, {
                        [dataType]: data
                    });
            }

            return true;
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            return false;
        }
    }

    // Save data for guest user
    saveToLocalStorage(dataType, data) {
        try {
            const key = `centremart_${dataType}`;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    // Load data for guest user
    loadFromLocalStorage(dataType) {
        try {
            const key = `centremart_${dataType}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    // Smart save - decides where to save based on user status
    async smartSave(user, dataType, data) {
        if (user) {
            // User is signed in - save to Firebase
            return await this.saveToFirebase(user.uid, dataType, data);
        } else {
            // Guest user - save to localStorage
            return this.saveToLocalStorage(dataType, data);
        }
    }

    // Smart load - decides where to load from based on user status
    async smartLoad(user, dataType) {
        if (user) {
            // User is signed in - load from Firebase
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    return userDoc.data()[dataType] || null;
                }
            } catch (error) {
                console.error('Error loading from Firebase:', error);
            }
            return null;
        } else {
            // Guest user - load from localStorage
            return this.loadFromLocalStorage(dataType);
        }
    }

    // Migrate guest data to user account when they sign in
    async migrateGuestData(user) {
        try {
            const guestData = {
                cart: this.loadFromLocalStorage('cart'),
                wishlist: this.loadFromLocalStorage('wishlist'),
                recentlyViewed: this.loadFromLocalStorage('recentlyViewed'),
                addresses: this.loadFromLocalStorage('addresses')
            };

            // Save all guest data to user's Firebase account
            for (const [dataType, data] of Object.entries(guestData)) {
                if (data) {
                    await this.saveToFirebase(user.uid, dataType, data);
                }
            }

            // Clear guest data from localStorage
            this.clearGuestData();

            return true;
        } catch (error) {
            console.error('Error migrating guest data:', error);
            return false;
        }
    }

    // Clear all guest data
    clearGuestData() {
        const keys = ['cart', 'wishlist', 'recentlyViewed', 'addresses'];
        keys.forEach(key => {
            localStorage.removeItem(`centremart_${key}`);
        });
        localStorage.removeItem('centremart_guest_id');
    }

    // Check if user has existing data
    async hasExistingData(user, dataType) {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    return userDoc.data()[dataType] !== undefined;
                }
            } catch (error) {
                console.error('Error checking Firebase data:', error);
            }
            return false;
        } else {
            return this.loadFromLocalStorage(dataType) !== null;
        }
    }

    // Get user's delivery addresses
    async getUserAddresses(user) {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    return userDoc.data().addresses || [];
                }
            } catch (error) {
                console.error('Error loading addresses:', error);
            }
            return [];
        } else {
            return this.loadFromLocalStorage('addresses') || [];
        }
    }

    // Save delivery address
    async saveAddress(user, address) {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    addresses: arrayUnion(address)
                });
                return true;
            } catch (error) {
                console.error('Error saving address to Firebase:', error);
                return false;
            }
        } else {
            const addresses = this.loadFromLocalStorage('addresses') || [];
            addresses.push(address);
            return this.saveToLocalStorage('addresses', addresses);
        }
    }

    // Get user's order history
    async getOrderHistory(user) {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    return userDoc.data().orders || [];
                }
            } catch (error) {
                console.error('Error loading orders:', error);
            }
            return [];
        } else {
            return this.loadFromLocalStorage('orders') || [];
        }
    }

    // Save order
    async saveOrder(user, order) {
        if (user) {
            return await this.saveToFirebase(user.uid, 'orders', order);
        } else {
            const orders = this.loadFromLocalStorage('orders') || [];
            orders.push(order);
            return this.saveToLocalStorage('orders', orders);
        }
    }
}

// Create singleton instance
const userDataManager = new UserDataManager();
export default userDataManager;