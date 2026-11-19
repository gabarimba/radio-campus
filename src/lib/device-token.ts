"use client";

const STORAGE_KEY = "radio-campus-dispositivo-v1";
export function deviceToken(): string {
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}
