/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Scheduled function to send review reminders
exports.sendReviewReminders = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async(context) => {
        const now = admin.firestore.Timestamp.now();
        const fiveHoursAgo = new Date(
            now.toDate().getTime() - 5 * 60 * 60 * 1000
        );

        // Get orders older than 5 hours, not yet reviewed
        const ordersSnap = await db
            .collection("orders")
            .where(
                "createdAt",
                "<=",
                admin.firestore.Timestamp.fromDate(fiveHoursAgo),
            )
            .where("status", "==", "Delivered") // Only remind for delivered orders
            .get();

        for (const orderDoc of ordersSnap.docs) {
            const order = orderDoc.data();
            if (!order.userId || !order.productId) {
                continue;
            }

            // Check if review exists
            const reviewsSnap = await db
                .collection("productReviews")
                .where("productId", "==", order.productId)
                .where("userId", "==", order.userId)
                .get();
            if (!reviewsSnap.empty) {
                continue; // Already reviewed
            }

            // Check if reminder already sent
            const notifSnap = await db
                .collection("notifications")
                .where("userId", "==", order.userId)
                .where("orderId", "==", orderDoc.id)
                .where("type", "==", "review-reminder")
                .get();
            if (!notifSnap.empty) {
                continue; // Already reminded
            }

            // Send notification
            await db.collection("notifications").add({
                userId: order.userId,
                orderId: orderDoc.id,
                productId: order.productId,
                type: "review-reminder",
                message: "Please rate and review your recent purchase: " +
                    order.productName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
            functions.logger.info(
                "Sent review reminder to user " +
                order.userId +
                " for order " +
                orderDoc.id
            );
        }
        return null;
    });