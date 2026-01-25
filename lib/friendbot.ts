import { toast } from "sonner";

export async function fundAccount(publicKey: string) {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to fund account");
    }

    return data;
  } catch (error: any) {
    console.error("Friendbot error:", error);
    throw new Error(error.message || "Network error connecting to Friendbot");
  }
}
