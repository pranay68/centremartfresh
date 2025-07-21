import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

class NotificationSystem {
    constructor() {
        this.audio = null;
        this.notificationPermission = false;
        this.init();
    }

    async init() {
        // Initialize audio
        this.audio = new Audio('/assets/Coffin Dance - [edit audio].mp3');
        this.audio.volume = 0.7;

        // Request notification permission
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        }
    }

    // Play coffin dance sound
    playCoffinDance() {
        if (this.audio) {
            this.audio.currentTime = 0;
            this.audio.play().catch(err => console.log('Audio play failed:', err));
        }
    }

    // Send browser notification
    sendBrowserNotification(title, body, icon = '/image.png') {
        if (this.notificationPermission && 'Notification' in window) {
            new Notification(title, {
                body,
                icon,
                badge: '/image.png',
                tag: 'order-notification',
                requireInteraction: true,
                silent: false
            });
        }
    }

    // Send order notification to admin
    async sendOrderNotification(orderData) {
        try {
            const notificationData = {
                type: 'order',
                title: '🛒 New Order Received!',
                message: `Order #${orderData.orderId} - ${orderData.productName} - Rs. ${orderData.totalAmount}`,
                orderId: orderData.orderId,
                orderStatus: 'pending',
                userId: orderData.userId,
                createdAt: serverTimestamp(),
                read: false,
                priority: 'high',
                sound: 'coffin-dance'
            };

            // Send to admin notifications
            await addDoc(collection(db, 'adminNotifications'), notificationData);

            // Play coffin dance sound
            this.playCoffinDance();

            // Send browser notification
            this.sendBrowserNotification(
                '🛒 New Order!',
                `Order #${orderData.orderId} - ${orderData.productName}`,
                '/image.png'
            );

            console.log('Order notification sent successfully');
        } catch (error) {
            console.error('Error sending order notification:', error);
        }
    }

    // Send order status update notification
    async sendOrderStatusNotification(orderId, status, userId) {
        try {
            const statusMessages = {
                'confirmed': '✅ Order Confirmed',
                'processing': '⚙️ Order Processing',
                'shipped': '🚚 Order Shipped',
                'delivered': '📦 Order Delivered',
                'cancelled': '❌ Order Cancelled'
            };

            const notificationData = {
                type: 'order_status',
                title: statusMessages[status] || 'Order Status Update',
                message: `Order #${orderId} status changed to ${status}`,
                orderId,
                orderStatus: status,
                userId,
                createdAt: serverTimestamp(),
                read: false,
                priority: 'medium'
            };

            await addDoc(collection(db, 'notifications'), notificationData);

            // Play sound for important status updates
            if (['confirmed', 'shipped', 'delivered'].includes(status)) {
                this.playCoffinDance();
            }

            console.log('Order status notification sent');
        } catch (error) {
            console.error('Error sending order status notification:', error);
        }
    }

    // Send admin notification
    async sendAdminNotification(title, message, type = 'info') {
        try {
            const notificationData = {
                type,
                title,
                message,
                createdAt: serverTimestamp(),
                read: false,
                priority: 'medium',
                sentBy: 'system'
            };

            await addDoc(collection(db, 'adminNotifications'), notificationData);
            console.log('Admin notification sent');
        } catch (error) {
            console.error('Error sending admin notification:', error);
        }
    }

    // Listen for new orders and send notifications
    startOrderListener() {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('status', '==', 'pending'));

        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const orderData = change.doc.data();
                    this.sendOrderNotification({
                        orderId: change.doc.id,
                        productName: orderData.productName || 'Product',
                        totalAmount: orderData.totalAmount || 0,
                        userId: orderData.userId
                    });
                }
            });
        });
    }

    // Listen for order status changes
    startOrderStatusListener() {
        const ordersRef = collection(db, 'orders');

        return onSnapshot(ordersRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const orderData = change.doc.data();
                    const previousData = change.doc.metadata.hasPendingWrites ? null : orderData;

                    // Check if status changed
                    if (previousData && previousData.status !== orderData.status) {
                        this.sendOrderStatusNotification(
                            change.doc.id,
                            orderData.status,
                            orderData.userId
                        );
                    }
                }
            });
        });
    }

    // Test notification system
    testNotification() {
        this.sendOrderNotification({
            orderId: 'TEST-' + Date.now(),
            productName: 'Test Product',
            totalAmount: 999,
            userId: 'test-user'
        });
    }
}

// Create singleton instance
const notificationSystem = new NotificationSystem();

export default notificationSystem;