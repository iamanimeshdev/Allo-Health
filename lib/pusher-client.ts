import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (typeof window === "undefined") return null;

  if (!pusherClientInstance) {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.warn("Pusher client environment variables missing. WebSockets disabled.");
      return null;
    }

    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
  }

  return pusherClientInstance;
};
