export interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface ScanLine {
  y: number;
  speed: number;
  direction: number;
  color: string;
  width: number;
} 