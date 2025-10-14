// import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      name: string;
      email: string;
    };
  }

  interface User {
    role: string;
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    username: string;
  }
}
