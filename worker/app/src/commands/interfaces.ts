export class ConnectionInfo {
  constructor(public host: string, public port: string) { }
}
export interface ICommandEnvVars {
  [key: string]: Array<string | ConnectionInfo>;
}
