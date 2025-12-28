import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { sign } from 'tweetnacl';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const TEXT_ENCODER = new TextEncoder();
const SEED = TEXT_ENCODER.encode('SeedForTest234567890123456789012');

describe('The Entrypoint Worker', () => {
	it('responds to ping', async () => {
		const body = '{"type":1}';
		const timestamp = '12345';
		const { publicKey, signature } = makeSignature(body, timestamp);

		const request = new IncomingRequest('http://example.com', {
			method: 'POST',
			headers: {
				'X-Signature-Ed25519': signature,
				'X-Signature-Timestamp': timestamp,
			},
			body,
		});
		const env = {
			DISCORD_PUBLIC_KEY: publicKey,
		};
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const respBody = await response.json();
		expect(respBody).toHaveProperty('type', 1);
	});

	it('refuses a wrong signature', async () => {
		const body = '{"type":1}';
		const timestamp = '12345';
		const { publicKey, signature } = makeSignature(body, timestamp);
		const wrongSignature = destroySignature(signature);

		const request = new IncomingRequest('http://example.com', {
			method: 'POST',
			headers: {
				'X-Signature-Ed25519': wrongSignature,
				'X-Signature-Timestamp': timestamp,
			},
			body,
		});
		const env = {
			DISCORD_PUBLIC_KEY: publicKey,
		};
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		const respBody = await response.json();
		expect(respBody).toHaveProperty('title', 'Unauthorized');
		expect(respBody).toHaveProperty('detail', 'Your signature is invalid.');
	});
});

function makeSignature(body: string, timestamp: string): { publicKey: string; signature: string } {
	const message = timestamp + body;

	const messageBytes = TEXT_ENCODER.encode(message);
	const keyPair = sign.keyPair.fromSeed(SEED);
	const publicKey = keyPair.publicKey.toHex();
	const signature = sign.detached(messageBytes, keyPair.secretKey).toHex();
	return { publicKey, signature };
}

function destroySignature(signature: string): string {
	// 1バイト目を反転させ、正しいsignatureを誤ったものにする。
	const buf = Uint8Array.fromHex(signature);
	buf[0] = buf[0] ^ 0xff;
	return buf.toHex();
}
