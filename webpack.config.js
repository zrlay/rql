const path = require("path");
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");
var PROD = JSON.parse(process.env.NODE_ENV || "0");

module.exports = {
  entry: {
    rql: "./angularjs/rql.js",
    "rql.min": "./angularjs/rql.js"
  },
  devtool: "source-map",
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "angularjs", "dist")
  },
  plugins: [new UglifyJSPlugin({
          sourceMap: true,
            include: /\.min\.js$/,
          mangle: {
            // Skip mangling these
            except: ["$super", "$", "exports", "require"]
          }
        })
      ]
};
