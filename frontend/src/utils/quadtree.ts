/**
 * QuadTree Spatial Partitioning.
 * Optimized for the X/Z plane of a 3D scene to enable fast frustum culling.
 * Ensures stable 60FPS rendering by preventing the engine from processing off-screen nodes.
 */

export interface Point3D {
  id: string;
  x: number;
  y: number; // Mapped to Z in 3D space
  z: number; // Mapped to Y in 3D space (height)
  data: unknown;
}

export interface Rectangle {
  x: number;
  y: number;
  w: number; // width (X axis)
  h: number; // height (Z axis)
}

export class QuadTree {
  private boundary: Rectangle;
  private capacity: number;
  private points: Point3D[];
  private divided: boolean;
  private northWest: QuadTree | null;
  private northEast: QuadTree | null;
  private southWest: QuadTree | null;
  private southEast: QuadTree | null;

  constructor(boundary: Rectangle, capacity: number = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
    this.northWest = null;
    this.northEast = null;
    this.southWest = null;
    this.southEast = null;
  }

  /** Subdivides the current quadrant into four sub-quadrants. */
  private subdivide(): void {
    const { x, y, w, h } = this.boundary;
    const halfW = w / 2;
    const halfH = h / 2;

    this.northWest = new QuadTree({ x: x - halfW, y: y - halfH, w: halfW, h: halfH }, this.capacity);
    this.northEast = new QuadTree({ x: x + halfW, y: y - halfH, w: halfW, h: halfH }, this.capacity);
    this.southWest = new QuadTree({ x: x - halfW, y: y + halfH, w: halfW, h: halfH }, this.capacity);
    this.southEast = new QuadTree({ x: x + halfW, y: y + halfH, w: halfW, h: halfH }, this.capacity);
    this.divided = true;
  }

  /** Inserts a point into the QuadTree. */
  public insert(point: Point3D): boolean {
    // Ignore objects that do not belong in this quad tree
    if (
      point.x < this.boundary.x - this.boundary.w ||
      point.x > this.boundary.x + this.boundary.w ||
      point.y < this.boundary.y - this.boundary.h ||
      point.y > this.boundary.y + this.boundary.h
    ) {
      return false;
    }

    // If there is space in this quad tree, add the object here
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    // Otherwise, subdivide and add the object to whichever node will accept it
    if (!this.divided) {
      this.subdivide();
    }

    if (this.northWest!.insert(point)) return true;
    if (this.northEast!.insert(point)) return true;
    if (this.southWest!.insert(point)) return true;
    if (this.southEast!.insert(point)) return true;

    return false; // Should never reach here if boundary is correct
  }

  /** Finds all points within a given rectangular range. */
  public query(range: Rectangle, found: Point3D[] = []): Point3D[] {
    // Automatically abort if the range does not collide with this quad
    if (
      range.x > this.boundary.x + this.boundary.w ||
      range.x + range.w < this.boundary.x - this.boundary.w ||
      range.y > this.boundary.y + this.boundary.h ||
      range.y + range.h < this.boundary.y - this.boundary.h
    ) {
      return found;
    }

    // Otherwise, check points in this quad
    for (const p of this.points) {
      if (
        p.x >= range.x - range.w / 2 &&
        p.x <= range.x + range.w / 2 &&
        p.y >= range.y - range.h / 2 &&
        p.y <= range.y + range.h / 2
      ) {
        found.push(p);
      }
    }

    // Recursively search the children
    if (this.divided) {
      this.northWest!.query(range, found);
      this.northEast!.query(range, found);
      this.southWest!.query(range, found);
      this.southEast!.query(range, found);
    }

    return found;
  }

  /** Clears the tree and all its children. */
  public clear(): void {
    this.points = [];
    this.divided = false;
    this.northWest = null;
    this.northEast = null;
    this.southWest = null;
    this.southEast = null;
  }
}