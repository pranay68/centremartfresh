// Usage: node src/utils/setAdminClaim.js /path/to/serviceAccount.json <uidOrEmail>
const admin = require('firebase-admin');
const path = require('path');

async function main() {
    const keyPath = process.argv[2];
    const uidOrEmail = process.argv[3];
    if (!keyPath || !uidOrEmail) {
        console.error('Usage: node src/utils/setAdminClaim.js /path/to/serviceAccount.json <uidOrEmail>');
        process.exit(1);
    }
    const serviceAccount = require(path.resolve(keyPath));
    if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const auth = admin.auth();
    let uid = uidOrEmail;
    if (!uidOrEmail.includes(':') && uidOrEmail.includes('@')) {
        const user = await auth.getUserByEmail(uidOrEmail);
        uid = user.uid;
    }
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Set admin=true claim for uid=${uid}`);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});