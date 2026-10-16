import { createClient } from "redis";
import config from "../config";

interface InMemoryItem {
	value: string;
	expiresAt?: number;
}

const memoryStore = new Map<string, InMemoryItem>();

let useFallback = false;
let isConnected = false;

const rawRedisClient = createClient({
	username: config.redis_user || undefined,
	password: config.redis_password || undefined,
	socket: {
		host: config.redis_host || "127.0.0.1",
		port: Number(config.redis_port) || 6379,
		connectTimeout: 3000,
		reconnectStrategy: false,
	},
});

rawRedisClient.on("error", (err) => {
	if (!useFallback) {
		console.warn("Redis client error, switching to in-memory store:", err.message);
		useFallback = true;
	}
});

export const redisClient = {
	get isOpen() {
		return isConnected;
	},

	async connect(): Promise<void> {
		if (isConnected) return;
		try {
			await rawRedisClient.connect();
			isConnected = true;
			useFallback = false;
			console.log("Connected to remote Redis successfully.");
		} catch (error: any) {
			console.warn(
				`Unable to connect to Redis (${error?.message || "connection error"}). Using in-memory fallback cache.`,
			);
			useFallback = true;
			isConnected = true;
		}
	},

	async disconnect(): Promise<void> {
		isConnected = false;
		if (!useFallback) {
			try {
				await rawRedisClient.disconnect();
			} catch {}
		}
		memoryStore.clear();
	},

	async get(key: string): Promise<string | null> {
		if (!useFallback) {
			try {
				return await rawRedisClient.get(key);
			} catch (error: any) {
				console.warn("Redis GET error, falling back to memory:", error.message);
				useFallback = true;
			}
		}

		const item = memoryStore.get(key);
		if (!item) return null;
		if (item.expiresAt && Date.now() > item.expiresAt) {
			memoryStore.delete(key);
			return null;
		}
		return item.value;
	},

	async set(
		key: string,
		value: string,
		options?: { expiration?: { type: "EX" | "PX"; value: number } },
	): Promise<string | null> {
		if (!useFallback) {
			try {
				if (options?.expiration) {
					if (options.expiration.type === "EX") {
						return await rawRedisClient.setEx(key, options.expiration.value, value);
					}
					if (options.expiration.type === "PX") {
						return await rawRedisClient.pSetEx(key, options.expiration.value, value);
					}
				}
				return await rawRedisClient.set(key, value);
			} catch (error: any) {
				console.warn("Redis SET error, falling back to memory:", error.message);
				useFallback = true;
			}
		}

		let expiresAt: number | undefined;
		if (options?.expiration) {
			if (options.expiration.type === "EX") {
				expiresAt = Date.now() + options.expiration.value * 1000;
			} else if (options.expiration.type === "PX") {
				expiresAt = Date.now() + options.expiration.value;
			}
		}

		memoryStore.set(key, { value, expiresAt });
		return "OK";
	},

	async del(key: string | string[]): Promise<number> {
		if (!useFallback) {
			try {
				return await rawRedisClient.del(key);
			} catch (error: any) {
				console.warn("Redis DEL error, falling back to memory:", error.message);
				useFallback = true;
			}
		}

		const keys = Array.isArray(key) ? key : [key];
		let count = 0;
		for (const k of keys) {
			if (memoryStore.delete(k)) {
				count++;
			}
		}
		return count;
	},

	async ttl(key: string): Promise<number> {
		if (!useFallback) {
			try {
				return await rawRedisClient.ttl(key);
			} catch (error: any) {
				console.warn("Redis TTL error, falling back to memory:", error.message);
				useFallback = true;
			}
		}

		const item = memoryStore.get(key);
		if (!item) return -2;
		if (!item.expiresAt) return -1;
		const remainingMs = item.expiresAt - Date.now();
		if (remainingMs <= 0) {
			memoryStore.delete(key);
			return -2;
		}
		return Math.ceil(remainingMs / 1000);
	},
};
