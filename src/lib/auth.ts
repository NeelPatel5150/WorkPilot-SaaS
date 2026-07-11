import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      companyId: {
        type: "string",
        required: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "EMPLOYEE",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
