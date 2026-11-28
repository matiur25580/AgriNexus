declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string };
      organization?: { id: string; role: "owner" | "admin" | "manager" | "field_agent" | "viewer" };
    }
  }
}
export {};
