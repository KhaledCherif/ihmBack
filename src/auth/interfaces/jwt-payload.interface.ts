export interface JwtPayload {
  sub: number;
  email: string;
  isAdmin: boolean;
  isProvider: boolean;
}
