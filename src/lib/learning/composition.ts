import "server-only";

import { LearningService } from "./learningService";
import { PrismaLearningRepository } from "./prismaLearningRepository";

let service: LearningService | undefined;

export function getLearningService(): LearningService {
  service ??= new LearningService(new PrismaLearningRepository());
  return service;
}
