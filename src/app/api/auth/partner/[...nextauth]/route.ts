import NextAuth from "next-auth";
import { partnerAuthOptions } from "@/lib/auth";

const handler = NextAuth(partnerAuthOptions);
export { handler as GET, handler as POST };
