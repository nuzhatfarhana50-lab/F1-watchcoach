import { z } from "zod";

export const openF1SessionSchema = z.object({
  meeting_key: z.number().int(),
  session_key: z.number().int(),
  year: z.number().int(),
  session_name: z.string().min(1),
  session_type: z.string().min(1),
  country_name: z.string().min(1),
  circuit_short_name: z.string().min(1),
  date_start: z.string().datetime({ offset: true }),
  date_end: z.string().datetime({ offset: true }),
}).passthrough();

export const openF1LapSchema = z.object({
  driver_number: z.number().int().positive(),
  lap_number: z.number().int().positive(),
  lap_duration: z.number().nonnegative().nullable().optional(),
  date_start: z.string().datetime({ offset: true }).nullable().optional(),
}).passthrough();

export const openF1PositionSchema = z.object({
  driver_number: z.number().int().positive(),
  position: z.number().int().positive(),
  date: z.string().datetime({ offset: true }),
}).passthrough();

export const openF1PitSchema = z.object({
  driver_number: z.number().int().positive(),
  lap_number: z.number().int().positive(),
  date: z.string().datetime({ offset: true }),
  lane_duration: z.number().nonnegative().nullable().optional(),
  stop_duration: z.number().nonnegative().nullable().optional(),
}).passthrough();

export const openF1StintSchema = z.object({
  driver_number: z.number().int().positive(),
  stint_number: z.number().int().positive(),
  lap_start: z.number().int().positive(),
  lap_end: z.number().int().positive().nullable().optional(),
  compound: z.string().min(1).nullable().optional(),
  tyre_age_at_start: z.number().int().nonnegative().nullable().optional(),
}).passthrough();

export const openF1RaceControlSchema = z.object({
  category: z.string().min(1),
  message: z.string().min(1),
  date: z.string().datetime({ offset: true }),
  driver_number: z.number().int().positive().nullable().optional(),
  lap_number: z.number().int().positive().nullable().optional(),
  flag: z.string().nullable().optional(),
}).passthrough();

export const openF1CarDataSchema = z.object({
  driver_number: z.number().int().positive(),
  date: z.string().datetime({ offset: true }),
  speed: z.number().nonnegative().nullable().optional(),
  rpm: z.number().nonnegative().nullable().optional(),
  n_gear: z.number().int().nonnegative().nullable().optional(),
  throttle: z.number().nonnegative().nullable().optional(),
  brake: z.number().nonnegative().nullable().optional(),
  drs: z.number().int().nonnegative().nullable().optional(),
}).passthrough();
