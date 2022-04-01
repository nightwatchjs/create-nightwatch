export default class Logger {
  static error(...msgs: string[]) {
    console.error(...msgs);
  };
}