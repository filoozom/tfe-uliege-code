import webpack from "webpack";
import { createConfigItem } from "@babel/core";

// https://github.com/GoogleChromeLabs/native-url/issues/26
const fixNativeUrl = createConfigItem(({ types: t }) => {
  return {
    visitor: {
      ExportNamedDeclaration(path) {
        const properties = path.node.specifiers.map((node) => ({
          exported: node.exported.name,
          local: node.local.name,
        }));
        path.insertAfter(
          t.exportDefaultDeclaration(
            t.objectExpression(
              properties.map((prop) =>
                t.objectProperty(
                  t.identifier(prop.exported),
                  t.identifier(prop.local)
                )
              )
            )
          )
        );
      },
    },
  };
});

export default (config, _, helpers) => {
  let { rule } = helpers.getLoadersByName(config, "babel-loader")[0];

  // Set a default present-env config without loose mode
  rule.options.presets = [
    [
      require.resolve("@babel/preset-env"),
      {
        loose: false,
        modules: false,
      },
    ],
  ];

  // Transpile the least possible by removing all plugins
  rule.options.plugins = [
    [
      "@babel/plugin-transform-react-jsx",
      { pragma: "h", pragmaFrag: "Fragment" },
    ],
  ];

  // Enable Buffer polyfill (for libp2p-noise)
  config.node.Buffer = true;
  config.resolve.alias.url = "native-url";

  // Fix native-url imports
  config.module.rules.push({
    test: /\.m?js$/,
    include: /node_modules\/native-url/,
    use: [
      {
        loader: "babel-loader",
        options: {
          plugins: [fixNativeUrl],
        },
      },
    ],
  });

  // (for libp2p-noise/src/constants.js)
  config.plugins.push(
    new webpack.DefinePlugin({
      "process.env": {},
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    })
  );
};
