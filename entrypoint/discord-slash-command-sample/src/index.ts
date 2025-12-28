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

		switch (interaction.type) {
			case 1: // PING
				return handlePing();

			case 2: {
				// APPLICATION COMMAND
				const data = interaction.data;
				switch (data.name) {
					case 'dice':
						return handleDice();
					case 'echo':
						return handleEcho(data.options);
				}
				break;
			}
		}

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

function handlePing(): Response {
	const body = { type: 1 }; // PONG
	return Response.json(body);
}

function handleDice(): Response {
	const roll = getRandomInt(6) + 1;
	const body = {
		type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
		data: {
			content: `${roll}`,
		},
	};
	return Response.json(body, { headers: { 'Content-Type': 'application/json' } });
}

function handleEcho(options: any[]): Response {
	const optionMessage = options.find((option: any) => option.name === 'message');
	const message = optionMessage.value;

	const body = {
		type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
		data: {
			content: message,
		},
	};
	return Response.json(body, { headers: { 'Content-Type': 'application/json' } });
}

// 0 to (max - 1)
function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}
