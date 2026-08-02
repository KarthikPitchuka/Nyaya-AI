import { WebSocket } from 'ws';

async function test() {
  const url = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  console.log('Connecting to IPv4 ONLY with headers...', url);
  const ws = new WebSocket(url, {
    family: 4,
    origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
    }
  });

  ws.on('open', () => {
    console.log('WS IPv4 with headers Open!');
    ws.close();
  });

  ws.on('error', (err) => {
    console.error('WS IPv4 with headers Error:', err);
  });
}
test();
