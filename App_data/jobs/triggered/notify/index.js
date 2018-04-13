const { Subscription } = require('../../../../db/db');
const configuredWebPush = require('../../../../configured-web-push');
const fs = require('fs');
const util = require('util');

const init = async function() {
    // Get all subscriptions here via `Subscription.find()
    // More info in http://mongoosejs.com/docs/api.html#find_find

    const readFile = util.promisify(fs.readFile);
    let pushMessage = "Come visit us again. We miss you!";

    try {
        const triviaFileContents = await readFile('trivia.json');
        pushMessage = JSON.parse(triviaFileContents).trivia[0];
    } catch (e) {
        console.error(e);
    }

    try {
        const cursor = Subscription.find().cursor();
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            try {
                console.log(doc);
                const push = await configuredWebPush.webPush.sendNotification({
                    endpoint: doc.endpoint,
                    keys: {
                        auth: doc.keys.auth,
                        p256dh: doc.keys.p256dh
                    }
                }, pushMessage, {contentEncoding: 'aes128gcm'});

                console.log(push);
            } catch (e) {
                // 404 for FCM AES128GCM
                if (e.statusCode === 410 || e.statusCode === 404) {
                    // delete invalid registration
                    try {
                        await Subscription.remove({endpoint: doc.endpoint}).exec();
                        console.log('Deleted: ' + doc.endpoint);
                    } catch (e) {
                        console.error('Failed to delete: ' + doc.endpoint);
                    }
                }

                console.log(e);
            }
        }
    } catch (e) {
        console.log(e);
    }

    console.log('Job executed correctly');
};

init().catch(function(err) {
    console.error(err);
    process.exit(1);
});
