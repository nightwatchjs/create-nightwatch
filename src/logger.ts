export default class Logger {
  static error(...msgs: string[]) {
    console.error(...msgs);
  }

  static info(...msgs: string[]) {
    // eslint-disable-next-line no-console
    console.info(...msgs);
  }

  static warn(...msgs: string[]) {
    // eslint-disable-next-line no-console
    console.warn(...msgs);
  }
}
