import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

const feedIds = process.argv.slice(2);

if (feedIds.length === 0) {
  console.error('Usage: node scripts/feed-errors.mjs <feedId> [feedId2 ...]');
  process.exit(1);
}

const client = new FalabellaClient();

for (const feedId of feedIds) {
  try {
    const response = await client.request({
      action: 'FeedStatus',
      method: 'GET',
      params: {
        FeedID: feedId
      }
    });

    const body = response?.SuccessResponse?.Body || response?.Body || {};
    const feed = body?.Feed || body;
    console.log(`\n=== FEED ${feedId} ===`);
    console.log(`STATUS=${feed?.Status || 'unknown'} TOTAL=${feed?.TotalRecords || 'n/a'} PROCESSED=${feed?.ProcessedRecords || 'n/a'} FAILED=${feed?.FailedRecords || 'n/a'}`);
    if (!feed?.Status) {
      console.log('RAW', JSON.stringify(response).slice(0, 8000));
    }
    if (feed?.FeedErrors) {
      console.log('FEED_ERRORS', JSON.stringify(feed.FeedErrors).slice(0, 5000));
    }
    if (feed?.FeedWarnings) {
      console.log('FEED_WARNINGS', JSON.stringify(feed.FeedWarnings).slice(0, 5000));
    }
  } catch (error) {
    console.error(`FEED ${feedId} ERROR`, error.message);
    if (error.details) {
      console.error(JSON.stringify(error.details));
    }
  }
}