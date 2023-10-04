import express from 'express';
import axios from 'axios';
import cors from 'cors';

import * as fs from 'fs';
import * as path from 'path';

console.log('Starting backend...');

const chlamydbotUrlFile = fs.readFileSync(path.resolve(__dirname, '../local/chlamydbot-ip.txt'), 'utf8');
const chlamydbotUrl = chlamydbotUrlFile.split('\n')[0];

console.log('Read chlamydbotUrlFile');

const app = express();

app.use(express.json());
app.use(cors());

console.log('Created app');

let dynamicKey = '';

let openAIurl = 'https://api.openai.com/v1';

let openAIKey = '';

function genDynamicKey() {
    const random = Math.random().toString(36).substr(2);
    dynamicKey = Buffer.from(random).toString('base64');
}

async function postDynamicKey() {
    try {
        await axios.post(`http://${chlamydbotUrl}/set-dynamic-key`, { key: dynamicKey });
    } catch (e) {
        console.log('Failed to update dynamic key', e instanceof Error ? e.message : e);
    }
}

setInterval(
    () => {
        genDynamicKey();
        postDynamicKey()
            .then(() => console.log('Dynamic key updated'))
            .catch((err) => console.error(err));
    },
    1000 * 60 * 10,
);

genDynamicKey();
postDynamicKey();

console.log('Generated dynamic key');

app.post('/update-dynamic-key', async (_req, res) => {
    genDynamicKey();
    try {
        await postDynamicKey();
    } catch (err) {
        res.status(500).send({ error: err instanceof Error ? err.message : 'Unknown error' });
        return;
    }
    res.send({ success: true });
});

app.get('/key-initialized', (_req, res) => {
    res.send({ valid: openAIKey !== '' });
});

app.post('/chat', async (req, res) => {
    const { key, openAIrequest } = req.body;
    if (key !== dynamicKey) {
        res.status(401).send({ error: 'Invalid key' });
        return;
    }

    try {
        const response = await axios.post(`${openAIurl}/chat/completions`, openAIrequest, {
            headers: {
                Authorization: `Bearer ${openAIKey}`,
            },
        });
        res.send(response.data);
    } catch (error) {
        res.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
        return;
    }
});

app.post('/set-openai-url', (req, res) => {
    const { key, url } = req.body;
    if (key !== dynamicKey) {
        res.status(401).send({ error: 'Invalid key' });
        return;
    }

    openAIurl = url;
    res.send({ success: true });
});

app.post('/set-openai-key', (req, res) => {
    const { key, newKey } = req.body;
    if (key !== dynamicKey) {
        res.status(401).send({ error: 'Invalid key' });
        return;
    }

    openAIKey = newKey;
    res.send({ success: true });
});

console.log('Created api interfaces');

app.listen(8765, () => {
    console.log('Server listening on port 8765');
});
