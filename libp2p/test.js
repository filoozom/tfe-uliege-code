/*
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "sect239k1",
});
*/

/*
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");

console.log(publicKey.export({ type: "spki", format: "der" }));
console.log(privateKey.export({ type: "pkcs8", format: "der" }));
*/

function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sign(data) {
  /*
  const sign = crypto.createSign("SHA256");
  sign.write(data);
  sign.end();
  return sign.sign(privateKey, "hex");
  */

  return crypto.sign(null, data, privateKey);
}

function encode(type, data) {
  const instance = type.create(data);
  return type.encode(instance).finish();
}

function encodeDataPoint(data) {}

async function loadProto() {
  return await load("iot.proto");
  const DataPoint = root.lookupType("DataPoint");

  const previous =
    "6c61e3746d815958be2aa372de6e54b4fd0568cd3d595df98e21d99c34844e91";

  const dataPoint = encode(DataPoint, {
    previous,
    temperature: 36.56,
    humidity: 0.459,
  });

  const signedData = encode(SignedData, {
    source: publicKey,
    signature: sign(dataPoint),
    data: dataPoint,
  });

  console.log({ dataPoint, signedData, hash: hash(signedData) });
  console.log({
    dataPoint: dataPoint.length,
    signedData: signedData.length,
    hash: hash(signedData).length,
  });

  const sd = SignedData.decode(signedData);
  console.log(sd);
  const dp = DataPoint.decode(sd.data);
  console.log(dp);
}
