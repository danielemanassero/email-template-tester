'use strict';
// reference: https://igniz87.medium.com/using-log4js-to-logging-express-js-apps-c075d1d39f0e

import log4js from 'log4js';

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: { type: "file", filename: process.env.LOG_PATH, maxLogSize: '2M', backups: 3, compress: true},
  },
  categories: {
    default: { appenders: [process.env.LOG_TYPE], level: process.env.LOG_LEVEL },
  },
  disableClustering: true
});

export default log4js.getLogger(`${process.env.LOG_TYPE}`);