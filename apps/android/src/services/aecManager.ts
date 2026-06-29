import { NativeModules, Platform } from "react-native";

const { AECModule } = NativeModules;

export async function isHardwareAECAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await AECModule.isAECAvailable();
  } catch {
    return false;
  }
}
