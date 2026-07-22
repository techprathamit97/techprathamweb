declare module 'web-push' {
  export interface PushSubscriptionLike {
    endpoint: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  }

  export interface WebPushModule {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
    sendNotification: (subscription: PushSubscriptionLike, payload: string, options?: Record<string, unknown>) => Promise<void>;
  }

  const webpush: WebPushModule;
  export default webpush;
}
