
import { qdrantClient } from '../src/config/index';

const PHOTO_ID = 'd8af8ec3-9939-4206-8083-07f59ab7f7c5';
const ORG_ID = '1ff821ad-4673-450f-abb2-b2ff288e4040'; // Hardcoded based on previous context or will search all
const EVENT_PREFIX = `org_${ORG_ID}_event_`;

async function checkPhoto() {
    console.log(`Checking for photoId: ${PHOTO_ID}`);
    try {
        const collections = await qdrantClient.getCollections();

        for (const col of collections.collections) {
            if (!col.name.startsWith(EVENT_PREFIX)) continue;

            console.log(`Searching in collection: ${col.name}`);

            // Scroll points to find by payload
            const results = await qdrantClient.scroll(col.name, {
                filter: {
                    must: [
                        {
                            key: "photoId",
                            match: { value: PHOTO_ID }
                        }
                    ]
                },
                limit: 1
            });

            if (results.points.length > 0) {
                console.log(`FOUND in ${col.name}!`);
                console.log(JSON.stringify(results.points[0], null, 2));
                return;
            }
        }
        console.log("Photo NOT FOUND in any relevant Qdrant collection.");

    } catch (error) {
        console.error("Error:", error);
    }
}

checkPhoto();
