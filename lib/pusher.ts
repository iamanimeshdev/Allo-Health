import Pusher from "pusher";

export const getPusherServer = () => {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    console.warn("Pusher server environment variables missing. WebSockets disabled.");
    return null;
  }

  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });
};
