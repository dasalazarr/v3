export interface Config {
  PORT: number;
  jwtToken: string;
  numberId: string;
  verifyToken: string;
  version: string;
  Model: string;
  apiKey: string;
  spreadsheetId: string;
  privateKey: string;
  clientEmail: string;
}

export interface CitaResponse {
  mensaje: string;
  fechaHora: string;
  linkCalendario: string;
}

export interface UserData {
  number: string;
  name: string;
  mail: string;
}
