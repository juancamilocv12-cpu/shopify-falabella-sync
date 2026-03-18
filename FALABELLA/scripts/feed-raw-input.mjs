import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

const feedId = process.argv[2];
if (!feedId) {
  console.error('Usage: node scripts/feed-raw-input.mjs <feedId>');
  process.exit(1);
}

const client = new FalabellaClient();
const response = await client.request({
  action: 'GetFeedRawInput',
  method: 'GET',
  params: {
    FeedIdList: `["${feedId}"]`
  }
});

console.log(JSON.stringify(response).slice(0, 20000));