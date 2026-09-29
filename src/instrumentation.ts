export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensurePersistentData } = await import("@/lib/server/ensure-persistent-data");
    await ensurePersistentData();
  } catch (error) {
    console.warn("[persist] could not prepare data directory", error);
  }
}
