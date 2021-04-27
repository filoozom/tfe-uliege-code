const net = require("net");
const { program } = require("commander");
const { version } = require("./package.json");

// Constants
const TEMPERATURE_DECIMALS = 1;
const HUMIDITY_DECIMALS = 1;

// Functions
function encodeTemperature(temperature) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeInt32LE(Math.round(temperature * 10 ** TEMPERATURE_DECIMALS));
  return buffer;
}

function encodeHumidity(humidity) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(Math.round(humidity * 10 ** HUMIDITY_DECIMALS));
  return buffer;
}

// Most basic protocol that writes two integers on a TCP socket
function post(options) {
  const client = new net.Socket();
  const [host, port] = options.ingestor.split(":");

  client.connect(parseInt(port), host, () => {
    client.write(
      Buffer.concat([
        encodeTemperature(options.temperature),
        encodeHumidity(options.humidity),
      ])
    );
    client.destroy();
  });
}

program
  .version(version)
  .option(
    "-i, --ingestor <host:port>",
    "address of the ingestor",
    "127.0.0.1:45600"
  )
  .requiredOption("-t, --temperature <temperature>", "temperature", parseFloat)
  .requiredOption("-h, --humidity <humidity>", "humidity", parseFloat)
  .helpOption("--help")
  .parse();

post(program.opts());
