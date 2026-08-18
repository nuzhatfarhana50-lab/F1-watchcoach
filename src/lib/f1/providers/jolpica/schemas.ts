import { z } from "zod";

const driverSchema = z.object({
  driverId: z.string().min(1),
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  nationality: z.string().optional(),
}).passthrough();

const constructorSchema = z.object({
  constructorId: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string().optional(),
}).passthrough();

const resultSchema = z.object({
  position: z.string().optional(),
  points: z.string(),
  Driver: driverSchema,
  Constructor: constructorSchema,
  grid: z.string(),
  laps: z.string(),
  status: z.string().min(1),
}).passthrough();

const raceSchema = z.object({
  season: z.string().regex(/^\d{4}$/),
  round: z.string().regex(/^\d+$/),
  raceName: z.string().min(1),
  Circuit: z.object({
    circuitId: z.string().min(1),
    circuitName: z.string().min(1),
    Location: z.object({
      locality: z.string().min(1),
      country: z.string().min(1),
    }).passthrough(),
  }).passthrough(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  Results: z.array(resultSchema).optional(),
}).passthrough();

export const jolpicaRaceResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(raceSchema),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export type JolpicaRace = z.infer<typeof raceSchema>;
