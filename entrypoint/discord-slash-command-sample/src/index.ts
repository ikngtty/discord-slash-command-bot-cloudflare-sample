/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { sign } from 'tweetnacl';

import { ResponseError } from './types';

const TEXT_ENCODER = new TextEncoder();

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Get env vars.
		const publicKey = env.DISCORD_PUBLIC_KEY;
		if (publicKey == null || publicKey === '') {
			throw new Error('Missing env var "DISCORD_PUBLIC_KEY".');
		}

		// Get request's headers and body.
		const signature = request.headers.get('X-Signature-Ed25519');
		const timestamp = request.headers.get('X-Signature-Timestamp');
		if (signature == null || signature === '' || timestamp == null || timestamp === '') {
			const err: ResponseError = {
				title: 'Unauthorized',
				detail: `Headers for signature is missing.`,
			};
			return Response.json(err, { status: 401 });
		}
		const body = await request.text();

		// 署名の検証。
		if (!signatureIsValid(publicKey, body, timestamp, signature)) {
			const err: ResponseError = {
				title: 'Unauthorized',
				detail: 'Your signature is invalid.',
			};
			return Response.json(err, { status: 401 });
		}

		// ※スラッシュコマンドはinteractionの内の1つとして位置付けられる。
		let interaction;
		try {
			interaction = JSON.parse(body);
		} catch (err) {
			if (err instanceof SyntaxError) {
				const err: ResponseError = {
					title: 'Broken Request Body',
					detail: "Your request's body is broken.",
				};
				return Response.json(err, { status: 400 });
			}
			throw err;
		}

		// interaction typeの1がPING
		if (interaction.type === 1) {
			// interaction callback typeの1がPONG
			const body = { type: 1 };
			return Response.json(body);
		}

		// その他のケースはとりあえず未対応
		const err: ResponseError = {
			title: 'Unexpected Request Body',
			detail: "Your request's body is something different from our expectations.",
		};
		return Response.json(err, { status: 400 });
	},
} satisfies ExportedHandler<Env>;

function signatureIsValid(publicKey: string, body: string, timestamp: string, signature: string): boolean {
	const message = timestamp + body;

	let signatureBytes: Uint8Array, publicKeyBytes: Uint8Array;
	try {
		signatureBytes = Uint8Array.fromHex(signature);
		publicKeyBytes = Uint8Array.fromHex(publicKey);
	} catch (err) {
		if (err instanceof SyntaxError) {
			return false;
		}
		throw err;
	}
	const messageBytes = TEXT_ENCODER.encode(message);

	return sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
}
