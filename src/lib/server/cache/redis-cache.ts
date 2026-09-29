import "server-only";

import net from "node:net";

let offlineUntil = 0;

function redisUrl() {
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url.startsWith("redis://") && !url.startsWith("rediss://")) return "";
  return url;
}

function encode(args: string[]) {
  return `*${args.length}\r\n${args.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join("")}`;
}

function readOne(buf: string): { value: string | null; rest: string } | null {
  const nl = buf.indexOf("\r\n");
  if (nl < 1) return null;
  const line = buf.slice(0, nl);
  const rest = buf.slice(nl + 2);
  const kind = line[0];
  const body = line.slice(1);
  if (kind === "+") return { value: body, rest };
  if (kind === "-") throw new Error(body);
  if (kind === ":") return { value: body, rest };
  if (kind === "$") {
    const len = Number(body);
    if (len < 0) return { value: null, rest };
    if (rest.length < len + 2) return null;
    return { value: rest.slice(0, len), rest: rest.slice(len + 2) };
  }
  return { value: body, rest };
}

function command(url: string, args: string[]): Promise<string | null> {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = Number(parsed.port || 6379);
  const password = decodeURIComponent(parsed.password || "");
  const calls = password ? [encode(["AUTH", password]), encode(args)] : [encode(args)];

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("redis timeout"));
    }, 400);
    let buf = "";
    const values: Array<string | null> = [];
    const consume = () => {
      while (buf.length) {
        let parsedReply: { value: string | null; rest: string } | null;
        try {
          parsedReply = readOne(buf);
        } catch (error) {
          clearTimeout(timer);
          socket.destroy();
          reject(error);
          return;
        }
        if (!parsedReply) return;
        buf = parsedReply.rest;
        values.push(parsedReply.value);
        if (values.length >= calls.length) {
          clearTimeout(timer);
          socket.end();
          resolve(values[values.length - 1] ?? null);
          return;
        }
      }
    };
    socket.setEncoding("utf8");
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on("data", (chunk) => {
      buf += chunk;
      consume();
    });
    socket.on("connect", () => socket.write(calls.join("")));
  });
}

async function run(args: string[]): Promise<string | null> {
  const url = redisUrl();
  if (!url || Date.now() < offlineUntil) return null;
  try {
    return await command(url, args);
  } catch {
    offlineUntil = Date.now() + 60_000;
    return null;
  }
}

export function redisConfigured() {
  return Boolean(redisUrl());
}

export async function redisGet(key: string) {
  return run(["GET", key]);
}

export async function redisSet(key: string, value: string, ttlSec: number) {
  await run(["SETEX", key, String(ttlSec), value]);
}

export async function redisDel(key: string) {
  await run(["DEL", key]);
}
