const config = require("config");
const path = require("path");

export default function config_dir(dirname){

    const ourConfigDir = path.join(dirname, 'config')
    const baseConfig = config.util.loadFileConfigs(ourConfigDir)

    return baseConfig;

}