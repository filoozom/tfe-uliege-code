import PeerId from "peer-id";

// Proto
import { SignedData, TimestampedMessage } from "./proto";

export const decodeSignedData = async (raw) => {
  const { source, signature, data } = SignedData.decode(raw);
  const peerId = await PeerId.createFromPubKey(source);

  // Re-encode the TimestampedMessage to check its signature
  const message = TimestampedMessage.encode(data).finish();
  if (!(await peerId.pubKey.verify(message, signature))) {
    throw new Error("Invalid signature");
  }

  return { raw, peerId, data };
};
