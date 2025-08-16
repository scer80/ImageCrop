import { type Image, type InsertImage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: string): Promise<Image | undefined>;
  deleteImage(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private images: Map<string, Image>;

  constructor() {
    this.images = new Map();
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = randomUUID();
    const image: Image = { 
      ...insertImage, 
      id,
      uploadedAt: new Date()
    };
    this.images.set(id, image);
    return image;
  }

  async getImage(id: string): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async deleteImage(id: string): Promise<void> {
    this.images.delete(id);
  }
}

export const storage = new MemStorage();
