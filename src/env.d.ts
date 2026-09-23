/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    admin: import('./lib/auth/session').AdminUser | null;
  }
}
